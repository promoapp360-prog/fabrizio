import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { HttpError } from "./api";

export const STRIPE_APPLICATION = "vecciari";
// Il contratto Checkout dell'app non deve cambiare con la versione predefinita
// del conto Stripe. Aggiornare questa versione solo con verifiche di compatibilità.
export const STRIPE_API_VERSION = "2025-02-24.acacia";
type Fields = Record<string, string | number | boolean | undefined>;
export type StripeSession = {
  id: string; object: string; status: string; payment_status: string; url: string | null;
  amount_total: number | null; currency: string | null; livemode: boolean;
  payment_intent: string | null; metadata: Record<string, string>;
};
export type StripeEvent = {
  id: string; type: string; livemode: boolean; account?: string;
  data: { object: Record<string, unknown> };
};

let verification: { fingerprint: string; until: number } | undefined;
export class StripeProviderError extends HttpError {
  constructor(public readonly stripeStatus: number) { super(503, "Operazione Stripe non riuscita. Riprova o contatta il ristorante."); }
}
async function request<T>(path: string, fields?: Fields, idempotencyKey?: string): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !/^(sk|rk)_(live|test)_/.test(key)) throw new HttpError(503, "Stripe non configurato");
  const body = fields && new URLSearchParams(Object.entries(fields).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
  let response: Response;
  try {
    response = await fetch(`https://api.stripe.com/v1${path}`, {
      method: body ? "POST" : "GET", cache: "no-store",
      headers: { Authorization: `Bearer ${key}`, "Stripe-Version": STRIPE_API_VERSION,
        ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) },
      body, signal: AbortSignal.timeout(8000),
    });
  } catch { throw new HttpError(503, "Stripe non raggiungibile. Riprova senza creare un nuovo ordine."); }
  const result = await response.json().catch(() => null);
  // Non propagare errori Stripe: possono contenere chiavi parziali o dati cliente.
  if (!response.ok || !result) throw new StripeProviderError(response.status);
  return result as T;
}

export async function assertStripeAccount() {
  const expected = process.env.STRIPE_EXPECTED_ACCOUNT_ID;
  if (!expected) throw new HttpError(503, "Conto Stripe da verificare");
  const fingerprint = createHash("sha256").update(`${expected}:${process.env.STRIPE_SECRET_KEY ?? ""}`).digest("hex");
  if (verification?.fingerprint === fingerprint && verification.until > Date.now()) return;
  const account = await request<{ id: string; charges_enabled: boolean; default_currency: string }>("/account");
  if (account.id !== expected || !account.charges_enabled || account.default_currency !== "eur")
    throw new HttpError(503, "Il conto Stripe non corrisponde a quello autorizzato per Vecciarì");
  verification = { fingerprint, until: Date.now() + 60_000 };
}

export async function stripeRequest<T>(path: string, fields?: Fields, idempotencyKey?: string): Promise<T> {
  await assertStripeAccount();
  return request<T>(path, fields, idempotencyKey);
}

export function getCheckoutSession(id: string) {
  if (!/^cs_(?:live|test)_[a-zA-Z0-9]+$/.test(id)) throw new HttpError(409, "Riferimento pagamento non valido");
  return stripeRequest<StripeSession>(`/checkout/sessions/${id}`);
}

export function verifiedStripeEvent(payload: string, signature: string | null, now = Date.now()): StripeEvent {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new HttpError(503, "Webhook Stripe non configurato");
  const parts = (signature ?? "").split(",").map(x => x.split("="));
  const timestamps = parts.filter(([k]) => k === "t");
  const timestamp = timestamps.length === 1 ? timestamps[0][1] : "";
  if (!/^\d+$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 300) throw new HttpError(400, "Firma Stripe non valida");
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest();
  const valid = parts.some(([key, value]) => key === "v1" && /^[0-9a-f]{64}$/i.test(value ?? "") &&
    timingSafeEqual(expected, Buffer.from(value, "hex")));
  if (!valid) throw new HttpError(400, "Firma Stripe non valida");
  let event: StripeEvent;
  try { event = JSON.parse(payload); } catch { throw new HttpError(400, "Evento Stripe non valido"); }
  const live = /^(sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY ?? "");
  if (!event?.id || !event.type || !event.data?.object || event.livemode !== live ||
    event.account && event.account !== process.env.STRIPE_EXPECTED_ACCOUNT_ID)
    throw new HttpError(400, "Ambiente Stripe non corrispondente");
  return event;
}
