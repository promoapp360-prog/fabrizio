import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  db: { $transaction: vi.fn(), order: { findUnique: vi.fn(), update: vi.fn() }, payment: { create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), findFirst: vi.fn() } },
  stripe: vi.fn(), session: vi.fn(), email: vi.fn(),
}));
vi.mock("../src/lib/db", () => ({ db: m.db }));
vi.mock("../src/lib/settings", () => ({ getSettings: async () => ({ ordering: { stripeEnabled: true, payTiming: "ADVANCE" } }) }));
vi.mock("../src/lib/order-email", () => ({ sendOrderEmail: m.email }));
vi.mock("../src/lib/stripe-api", () => ({
  STRIPE_APPLICATION: "vecciari", stripeRequest: m.stripe, getCheckoutSession: m.session,
  StripeProviderError: class extends Error {},
}));
import { createCheckout, cancelCheckout, processStripeEvent, requirePaymentOrigin } from "../src/lib/stripe-payments";
import { readOrderWhatsAppDraft, saveOrderWhatsAppDraft } from "../src/lib/order-whatsapp";
import { readDiningParty, saveDiningParty } from "../src/lib/dining-party-storage";
import { coverCharge } from "../src/lib/portions";
import { orderWhatsAppMessage } from "../src/lib/whatsapp-draft";
type FixturePayment = { id: string; orderId: string; method: string; status: string; amountCents: number; externalRef: string | null; createdAt: Date };
let order: { id: string; number: number; status: string; hasWeighted: boolean; finalCents: number | null; payments: FixturePayment[] };
let session: any;
const event = (type = "checkout.session.completed") => ({ id: "evt_fixture", type, livemode: false, data: { object: { id: session.id, metadata: session.metadata } } });
function addPending(ref: string | null = session.id) {
  const payment: FixturePayment = { id: "payment_fixture", orderId: order.id, method: "STRIPE", status: "PENDING", amountCents: 4200, externalRef: ref, createdAt: new Date() };
  order.payments.push(payment); return payment;
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fixture_not_real");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_fixture_not_real");
  vi.stubEnv("STRIPE_EXPECTED_ACCOUNT_ID", "acct_fixture_not_real");
  vi.stubEnv("PUBLIC_BASE_URL", "https://restaurant.example");
  vi.stubEnv("PUBLIC_PAYMENT_ORIGINS", "");
  order = { id: "order_fixture", number: 42, status: "CONFIRMED", hasWeighted: true, finalCents: 4200, payments: [] };
  session = { id: "cs_test_fixture", status: "open", payment_status: "unpaid", amount_total: 4200, currency: "eur",
    success_url: "https://restaurant.example/ordine/order_fixture?pagamento=verifica",
    cancel_url: "https://restaurant.example/ordine/order_fixture?pagamento=annullato",
    payment_intent: "pi_fixture", url: "https://checkout.stripe.com/c/pay/fixture", livemode: false,
    metadata: { application: "vecciari", orderId: order.id, paymentId: "payment_fixture" } };
  m.db.$transaction.mockImplementation(async cb => cb(m.db));
  m.db.order.findUnique.mockImplementation(async () => order);
  m.db.order.update.mockImplementation(async () => order);
  m.db.payment.create.mockImplementation(async () => addPending(null));
  m.db.payment.update.mockImplementation(async ({ where, data }) => Object.assign(order.payments.find(p => p.id === where.id)!, data));
  m.db.payment.updateMany.mockImplementation(async ({ where, data }) => {
    const found = order.payments.find(p => p.id === where.id && p.status === where.status);
    if (found) Object.assign(found, data);
    return { count: found ? 1 : 0 };
  });
  m.db.payment.findFirst.mockImplementation(async ({ where }) => order.payments.find(p => p.id === where.id && (!where.status || p.status === where.status)));
  m.session.mockImplementation(async () => session);
  m.stripe.mockImplementation(async (path, fields) => path.startsWith("/prices?") ? { data: [{ id: "price_fixture", currency: "eur", unit_amount: 4200, product: "vecciari_order_balance", type: "one_time" }] } :
    path === "/checkout/sessions" ? Object.assign(session, { success_url: fields.success_url, cancel_url: fields.cancel_url }) :
    path.endsWith("/expire") ? { ...session, status: "expired" } : session);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("checkout e incassi: provider e database simulati", () => {
  it("blocca i tagli a peso non confermati prima di contattare Stripe", async () => {
    order.finalCents = null;
    await expect(createCheckout(order.id)).rejects.toThrow("conferma");
    expect(m.stripe).not.toHaveBeenCalled(); expect(m.db.payment.create).not.toHaveBeenCalled();
  });
  it("crea e riusa un solo tentativo senza addebitare alla creazione ordine", async () => {
    expect(await createCheckout(order.id)).toEqual({ url: session.url });
    expect(await createCheckout(order.id)).toEqual({ url: session.url });
    expect(order.payments).toHaveLength(1);
    expect(m.db.payment.create).toHaveBeenCalledTimes(1);
    const call = m.stripe.mock.calls.find(([path]) => path === "/checkout/sessions")!;
    expect(call[1]["line_items[0][price]"]).toBe("price_fixture");
    expect(call[1].success_url).toBe("https://restaurant.example/ordine/order_fixture?pagamento=verifica");
    expect(call[2]).toBe("vecciari-checkout-payment_fixture");
    expect(order.payments[0].status).toBe("PENDING");
  });
  it("non riapre un ordine già pagato", async () => {
    addPending().status = "PAID";
    await expect(createCheckout(order.id)).rejects.toThrow();
    expect(m.stripe).not.toHaveBeenCalled();
  });
  it("mantiene scadenza valida e identica nei retry di una preparazione incompleta", async () => {
    const payment = addPending(null);
    payment.createdAt = new Date(Date.now() - 34 * 60_000);
    const expectedExpiry = Math.floor(payment.createdAt.getTime() / 1000) + 2 * 60 * 60;
    m.stripe.mockImplementation(async path => {
      if (path === "/checkout/sessions") throw new Error("provider unavailable");
      return { data: [{ id: "price_fixture", currency: "eur", unit_amount: 4200, product: "vecciari_order_balance", type: "one_time" }] };
    });
    await expect(createCheckout(order.id)).rejects.toThrow("provider unavailable");
    await expect(createCheckout(order.id)).rejects.toThrow("provider unavailable");
    const calls = m.stripe.mock.calls.filter(([path]) => path === "/checkout/sessions");
    expect(calls).toHaveLength(2);
    for (const [, fields, key] of calls) {
      expect(fields.expires_at).toBe(expectedExpiry);
      expect(fields.expires_at - Date.now() / 1000).toBeGreaterThan(30 * 60);
      expect(fields["payment_method_types[0]"]).toBe("card");
      expect(key).toBe("vecciari-checkout-payment_fixture");
    }
    expect(m.db.payment.create).not.toHaveBeenCalled();
    expect(order.payments).toHaveLength(1);
  });
  it("ritorna sul medesimo alias autorizzato preservando la sessione del cliente", async () => {
    vi.stubEnv("PUBLIC_PAYMENT_ORIGINS", "https://alias.restaurant.example");
    const origin = requirePaymentOrigin(new Request("https://alias.restaurant.example/api", { headers: { origin: "https://alias.restaurant.example" } }));
    await createCheckout(order.id, origin);
    const call = m.stripe.mock.calls.find(([path]) => path === "/checkout/sessions")!;
    expect(call[1].success_url).toBe("https://alias.restaurant.example/ordine/order_fixture?pagamento=verifica");
    expect(call[1].cancel_url).toBe("https://alias.restaurant.example/ordine/order_fixture?pagamento=annullato");
  });
  it("rifiuta domini di ritorno arbitrari prima di creare un tentativo di pagamento", async () => {
    await expect(createCheckout(order.id, "https://outside.example")).rejects.toThrow("Origine");
    expect(m.stripe).not.toHaveBeenCalled(); expect(m.db.payment.create).not.toHaveBeenCalled();
  });
  it("conserva il collaudo con chiave test sul dominio di anteprima conosciuto", async () => {
    vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("REPLIT_DEV_DOMAIN", "preview.restaurant.example");
    const origin = requirePaymentOrigin(new Request("https://preview.restaurant.example/api", { headers: { origin: "https://preview.restaurant.example" } }));
    await createCheckout(order.id, origin);
    const call = m.stripe.mock.calls.find(([path]) => path === "/checkout/sessions")!;
    expect(call[1].success_url).toBe("https://preview.restaurant.example/ordine/order_fixture?pagamento=verifica");
  });
  it("recupera una sessione già aperta senza creare un secondo pagamento", async () => {
    addPending();
    expect(await createCheckout(order.id)).toEqual({ url: session.url });
    expect(m.session).toHaveBeenCalledWith(session.id);
    expect(m.db.payment.create).not.toHaveBeenCalled();
    expect(m.email).toHaveBeenCalledWith(order.id, "PAYMENT_PENDING", { staffOnly: true, revision: "payment_fixture" });
  });
  it.each(["https://www.vecciari.com", "https://www.vecciari.it", "https://vecciari.replit.app"])(
    "mantiene successo, annullamento e ripresa sul dominio ufficiale %s", async origin => {
      vi.stubEnv("PUBLIC_BASE_URL", "https://www.vecciari.com");
      vi.stubEnv("PUBLIC_PAYMENT_ORIGINS", "https://www.vecciari.it,https://vecciari.replit.app");
      const accepted = requirePaymentOrigin(new Request(`${origin}/api/order/${order.id}/checkout`, {
        headers: { origin, "x-forwarded-host": "attacker.example" },
      }));
      await createCheckout(order.id, accepted);
      expect(await createCheckout(order.id, accepted)).toEqual({ url: session.url });
      expect(session.success_url).toBe(`${origin}/ordine/${order.id}?pagamento=verifica`);
      expect(session.cancel_url).toBe(`${origin}/ordine/${order.id}?pagamento=annullato`);
      expect(order.payments).toHaveLength(1);
    });
  it.each(["https://www.vecciari.com", "https://www.vecciari.it", "https://vecciari.replit.app"])(
    "conserva dati privati, tavolo e gruppo dopo successo o annullamento su %s", async origin => {
      vi.stubEnv("PUBLIC_BASE_URL", "https://www.vecciari.com");
      vi.stubEnv("PUBLIC_PAYMENT_ORIGINS", "https://www.vecciari.it,https://vecciari.replit.app");
      // Separate stores per origin, like the browser. Returning to the canonical
      // host instead of the originating alias makes this test fail.
      let currentOrigin = origin;
      const storage = () => {
        const origins = new Map<string, Map<string, string>>();
        const current = () => {
          if (!origins.has(currentOrigin)) origins.set(currentOrigin, new Map());
          return origins.get(currentOrigin)!;
        };
        return { getItem: (key: string) => current().get(key) ?? null,
          setItem: (key: string, value: string) => { current().set(key, value); } };
      };
      vi.stubGlobal("window", { sessionStorage: storage(), localStorage: storage() });
      const group = { key: "12345678-1234-4234-8234-123456789abc", people: 3, confirmed: true, at: Date.now() };
      saveDiningParty(7, group);
      saveOrderWhatsAppDraft(order.id, {
        createdAt: Date.now(), payment: "STRIPE", autoRequested: true, attemptedStates: [], returnPath: "/t/private-table-token",
        details: { pickupName: "Cliente verifica", notes: "Nota privata cucina",
          items: [{ name: "Costata", quantity: 1, weightGrams: 600, cooking: "Media", options: ["Patate"], notes: "senza sale" }] },
      });
      const result = await createCheckout(order.id, origin);
      expect(Object.keys(result)).toEqual(["url"]);
      for (const returnUrl of [session.success_url, session.cancel_url]) {
        const url = new URL(returnUrl);
        currentOrigin = url.origin;
        const draft = readOrderWhatsAppDraft(order.id)!;
        expect(draft.returnPath).toBe("/t/private-table-token");
        expect(draft.details?.pickupName).toBe("Cliente verifica");
        expect(draft.details?.notes).toBe("Nota privata cucina");
        expect(draft.details?.items[0]).toMatchObject({ options: ["Patate"], cooking: "Media", notes: "senza sale", weightGrams: 600 });
        expect(readDiningParty(7)).toEqual(group);
        // The server quote for the restored capability reports three covers
        // already charged: a subsequent order must not quote them again.
        expect(coverCharge("TABLE", readDiningParty(7)!.people, 3, 200).cents).toBe(0);
        const message = orderWhatsAppMessage({ number: 42, channel: "TABLE", tableNumber: 7,
          ...draft.details!, totalCents: 4200, coverCount: 3, coverUnitCents: 200, payment: "STRIPE_PAID" });
        expect(message).toContain("Nota privata cucina");
        expect(message).toContain("Patate");
        expect(message).toContain("Tavolo: 7");
        expect(url.pathname).toBe(`/ordine/${order.id}`);
        expect([...url.searchParams.keys()]).toEqual(["pagamento"]);
        expect(url.hash).toBe("");
      }
      expect(order.finalCents).toBe(4200);
      expect(order.payments).toHaveLength(1);
    });
  it("non riusa su un altro alias un checkout che perderebbe la bozza e il gruppo", async () => {
    vi.stubEnv("PUBLIC_PAYMENT_ORIGINS", "https://alias.restaurant.example");
    addPending();
    await expect(createCheckout(order.id, "https://alias.restaurant.example")).rejects.toThrow("Annulla il tentativo");
    expect(order.payments[0].status).toBe("PENDING");
    expect(m.db.payment.create).not.toHaveBeenCalled();
    expect(m.db.payment.updateMany).not.toHaveBeenCalled();
    expect(m.stripe).not.toHaveBeenCalled();
  });
  it.each(["success_url", "cancel_url"])("rifiuta una sessione storica con %s diverso o assente", async field => {
    addPending(); session[field] = null;
    await expect(createCheckout(order.id)).rejects.toThrow("vecchio collegamento");
    expect(order.payments).toHaveLength(1);
  });
  it("controlla anche la risposta di un replay idempotente proveniente da un altro alias", async () => {
    vi.stubEnv("PUBLIC_PAYMENT_ORIGINS", "https://alias.restaurant.example");
    m.stripe.mockImplementation(async path => path.startsWith("/prices?") ? {
      data: [{ id: "price_fixture", currency: "eur", unit_amount: 4200, product: "vecciari_order_balance", type: "one_time" }],
    } : session);
    await expect(createCheckout(order.id, "https://alias.restaurant.example")).rejects.toThrow("altro dominio");
    expect(order.payments[0].externalRef).toBe(session.id);
    expect(order.payments[0].status).toBe("PENDING");
  });
  it.each(["https://user:password@restaurant.example", "https://restaurant.example/redirect", "https://restaurant.example?next=https://evil.example", "not-a-url"])(
    "rifiuta una configurazione di origine ambigua senza esporla: %s", async value => {
      vi.stubEnv("PUBLIC_PAYMENT_ORIGINS", value);
      await expect(createCheckout(order.id)).rejects.toThrow("non configurato correttamente");
      expect(m.stripe).not.toHaveBeenCalled();
    });
  it("non accetta prezzi Stripe diversi dal saldo canonico", async () => {
    m.stripe.mockResolvedValue({ data: [{ id: "price_fixture", currency: "usd", unit_amount: 1, product: "other", type: "one_time" }] });
    await expect(createCheckout(order.id)).rejects.toThrow("Checkout Stripe");
    expect(m.db.payment.create).not.toHaveBeenCalled();
  });
  it("registra l’incasso una sola volta anche con webhook ripetuto", async () => {
    addPending(); session.status = "complete"; session.payment_status = "paid";
    await processStripeEvent(event()); await processStripeEvent(event());
    expect(order.payments[0].status).toBe("PAID");
    expect(m.db.payment.update).toHaveBeenCalledTimes(1);
    expect(m.email).toHaveBeenCalledWith(order.id, "PAID");
  });
  it.each(["amount", "currency", "reference"])("rifiuta incasso con %s non corrispondente", async mismatch => {
    addPending(); session.payment_status = "paid";
    if (mismatch === "amount") session.amount_total = 1;
    if (mismatch === "currency") session.currency = "usd";
    if (mismatch === "reference") session.id = "cs_test_wrong";
    await expect(processStripeEvent(event())).rejects.toThrow("non corrispondente");
    expect(order.payments[0].status).toBe("PENDING"); expect(m.email).not.toHaveBeenCalled();
  });
  it("riapre la cassa soltanto dopo scadenza confermata da Stripe", async () => {
    addPending(); await cancelCheckout(order.id);
    expect(m.stripe).toHaveBeenCalledWith("/checkout/sessions/cs_test_fixture/expire", {});
    expect(order.payments[0].status).toBe("FAILED");
    expect(m.email).toHaveBeenCalledWith(order.id, "PAYMENT_CANCELLED", { staffOnly: true, revision: "payment_fixture" });
  });
  it("non sblocca la cassa se Stripe ha già incassato", async () => {
    addPending(); session.status = "complete"; session.payment_status = "paid";
    await expect(cancelCheckout(order.id)).rejects.toThrow("attendi");
    expect(order.payments[0].status).toBe("PENDING");
  });
  it("non permette un secondo incasso mentre la banca sta ancora confermando", async () => {
    addPending(); session.status = "complete"; session.payment_status = "unpaid"; session.url = null;
    await expect(createCheckout(order.id)).rejects.toThrow("in verifica");
    expect(order.payments[0].status).toBe("PENDING");
    expect(m.db.payment.updateMany).not.toHaveBeenCalled();
    expect(m.db.payment.create).not.toHaveBeenCalled();
  });
  it("non considera il ritorno dal checkout una conferma di incasso", async () => {
    addPending(); await processStripeEvent(event());
    expect(order.payments[0].status).toBe("PENDING"); expect(m.email).not.toHaveBeenCalled();
  });
  it("una scadenza tardiva non annulla un pagamento confermato", async () => {
    addPending().status = "PAID"; session.status = "expired";
    await processStripeEvent(event("checkout.session.expired"));
    expect(order.payments[0].status).toBe("PAID");
  });
  it("non interroga pagamenti di altre applicazioni", async () => {
    session.metadata.application = "other_fixture";
    await processStripeEvent(event());
    expect(m.session).not.toHaveBeenCalled(); expect(m.db.payment.update).not.toHaveBeenCalled();
  });
  it("riconosce il rimborso totale verificando il pagamento originario", async () => {
    addPending().status = "PAID";
    await processStripeEvent({ ...event("charge.refunded"), data: { object: {
      id: "ch_fixture", metadata: session.metadata, payment_intent: "pi_fixture", refunded: true, amount_refunded: 4200,
    } } });
    expect(order.payments[0].status).toBe("REFUNDED");
    expect(m.email).toHaveBeenCalledWith(order.id, "REFUNDED");
  });
  it.each(["checkout.session.expired", "checkout.session.async_payment_failed"])(
    "notifica al locale %s con chiave stabile per il replay del webhook", async type => {
      addPending(); session.status = "expired";
      await processStripeEvent(event(type)); await processStripeEvent(event(type));
      expect(order.payments[0].status).toBe("FAILED");
      const expected = type === "checkout.session.expired" ? "PAYMENT_EXPIRED" : "PAYMENT_FAILED";
      expect(m.email).toHaveBeenCalledWith(order.id, expected, { staffOnly: true, revision: "payment_fixture" });
    });
  it("notifica un rimborso parziale senza segnare il pagamento come interamente rimborsato", async () => {
    addPending().status = "PAID";
    await processStripeEvent({ ...event("charge.refunded"), data: { object: {
      id: "ch_fixture", metadata: session.metadata, payment_intent: "pi_fixture", refunded: false, amount_refunded: 1000,
    } } });
    expect(order.payments[0].status).toBe("PAID");
    expect(m.email).toHaveBeenCalledWith(order.id, "PARTIAL_REFUND", expect.objectContaining({
      staffOnly: true, revision: "evt_fixture", detail: expect.stringContaining("10,00"),
    }));
  });
  it("rifiuta richieste di pagamento da siti esterni", () => {
    expect(() => requirePaymentOrigin(new Request("https://restaurant.example/api", { headers: { origin: "https://other.example" } }))).toThrow("Origine");
    expect(() => requirePaymentOrigin(new Request("https://restaurant.example/api", { headers: { origin: "https://restaurant.example" } }))).not.toThrow();
  });
  it("accetta solo il dominio del cliente e gli alias esplicitamente autorizzati", () => {
    vi.stubEnv("PUBLIC_PAYMENT_ORIGINS", "https://alias.restaurant.example");
    vi.stubEnv("STRIPE_SECRET_KEY", "rk_live_fixture_not_a_credential");
    expect(() => requirePaymentOrigin(new Request("https://alias.restaurant.example/api", { headers: { origin: "https://alias.restaurant.example" } }))).not.toThrow();
    expect(() => requirePaymentOrigin(new Request("https://restaurant.example/api", { headers: { origin: "https://outside.example" } }))).toThrow();
  });
  it("non permette al browser dell’anteprima di avviare checkout con chiave live", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_fixture_not_real");
    expect(() => requirePaymentOrigin(new Request("https://preview.example/api", { headers: { origin: "https://preview.example" } }))).toThrow();
    await expect(createCheckout(order.id)).rejects.toThrow("non ancora configurato");
  });
});
