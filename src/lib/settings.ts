import { db } from "./db";
import { RESTAURANT_CONTACTS, RESTAURANT_HOURS } from "./restaurant-content";
import { stripeConfigured } from "./payment-policy";
// Impostazioni con valori di default: l'admin le sovrascrive da /admin/impostazioni.
export const DEFAULTS = {
  brand: { name: "Vecciarì", tagline: "Grano & Brace", motto: "Matera", logo: "/brand/logo-naming-oro.webp", mark: "/brand/fiamma-oro.webp", favicon: "/icon-32.png",
    colors: { ink: "10 10 8", coal: "22 20 16", gold: "233 194 58", goldDeep: "201 150 30", cream: "250 246 236" } },
  contacts: { ...RESTAURANT_CONTACTS, email: "", mapsUrl: "https://maps.app.goo.gl/DCFUrHrw9Mc3NMbV9", instagram: "https://www.instagram.com/vecciari_granoebrace/", facebook: "https://www.facebook.com/share/1EZLANWssE/?mibextid=wwXIfr",
    hours: RESTAURANT_HOURS },
  ordering: { tableEnabled: true, takeawayEnabled: false, deliveryEnabled: false, payAtTable: true, payAtCounter: true, stripeEnabled: false, payTiming: "END" as "END" | "ADVANCE",
    prepMinutes: 30, deliveryMinCents: 3000, deliveryFeeCents: 300, deliveryZones: "" },
  reservations: { autoConfirm: false, durationMin: 120, maxPartyOnline: 10, minNoticeMin: 60 },
  security: { minPasswordLength: 4 },
  seo: { title: "Vecciarì — Matera", description: "Vecciarì – Grano & Brace a Matera. Scopri il menu, il mondo della carne e prenota il tuo tavolo." },
  cooking: ["Al sangue", "Media-al sangue", "Media", "Media-ben cotta", "Ben cotta"],
};
export type Settings = typeof DEFAULTS;

export async function getSettings(): Promise<Settings> {
  const rows = await db.setting.findMany();
  const s = structuredClone(DEFAULTS) as Record<string, unknown>;
  for (const r of rows) s[r.key] = typeof r.value === "object" && !Array.isArray(r.value) ? { ...(s[r.key] as object), ...(r.value as object) } : r.value;
  return s as Settings;
}

export function integrationStatus() {
  const has = (...k: string[]) => k.every(x => !!process.env[x]);
  return [
    { key: "storage", name: "Archivio immagini", ok: has("PRIVATE_OBJECT_DIR"), env: "Configurazione gestita da Replit App Storage", help: "Carica le foto direttamente da Gestione Menu oppure Contenuti sito › Media." },
    { key: "email", name: "Email transazionali (SMTP)", ok: has("SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "MAIL_FROM"), env: "SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, MAIL_FROM", help: "Usa un provider SMTP (Brevo, Postmark, Gmail Workspace)." },
    { key: "stripe", name: "Pagamenti online Stripe", ok: stripeConfigured(), env: "STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_EXPECTED_ACCOUNT_ID, PUBLIC_BASE_URL", help: "Conto Vecciarì verificato e webhook firmato su /api/stripe/webhook; attiva il pagamento nella sezione Ordini solo dopo la configurazione." },
    { key: "whatsapp", name: "WhatsApp Business (Cloud API ufficiale)", ok: has("WHATSAPP_CLOUD_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"), env: "WHATSAPP_CLOUD_TOKEN, WHATSAPP_PHONE_NUMBER_ID", help: "Meta Business → WhatsApp → API Setup. Servono template approvati e consenso del cliente." },
    { key: "ga4", name: "Google Analytics 4", ok: has("NEXT_PUBLIC_GA4_ID"), env: "NEXT_PUBLIC_GA4_ID", help: "Caricato solo dopo consenso cookie statistici." },
    { key: "maps", name: "Google Maps", ok: has("GOOGLE_MAPS_EMBED_URL"), env: "GOOGLE_MAPS_EMBED_URL", help: "Google Maps → Condividi → Incorpora mappa → copia l'URL src." },
    { key: "pos", name: "Cassa / POS", ok: false, env: "—", help: "Predisposto: esportazione ordini via API /api/admin/orders. Integrazione specifica da sviluppare col fornitore." },
  ];
}
