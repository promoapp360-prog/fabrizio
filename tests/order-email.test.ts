import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findUniqueOrThrow: vi.fn(), notify: vi.fn() }));
vi.mock("../src/lib/db", () => ({ db: { order: { findUniqueOrThrow: mocks.findUniqueOrThrow } } }));
vi.mock("../src/lib/notify", () => ({ notify: mocks.notify }));
vi.mock("../src/lib/orders", () => ({ STATUS_LABEL: { RECEIVED: "Ricevuto", READY: "Pronto" } }));
vi.mock("../src/lib/settings", () => ({ getSettings: async () => ({ ordering: { stripeEnabled: false } }) }));
import { buildOrderEmail, buildRestaurantOrderEmail, sendOrderEmail, type OrderEmailData } from "../src/lib/order-email";

const order: OrderEmailData = {
  id: "test-order", number: 123, channel: "TAKEAWAY", tableNumber: null,
  customerName: "Nome ritiro", customer: { name: "Anagrafica" }, pickupAt: new Date("2026-11-20T19:00:00Z"),
  finalCents: null, estimatedCents: 2500, hasWeighted: true, notes: null,
  items: [{ quantity: 1, nameSnapshot: "Prodotto", cooking: "Media", lineEstCents: 2500, lineFinalCents: null }],
};
beforeEach(() => vi.resetAllMocks());

describe("contenuti e collegamento degli automatismi ordine", () => {
  it("conferma asporto con nome del ritiro, totale indicativo e orario italiano", () => {
    const mail = buildOrderEmail(order, "RECEIVED", "");
    expect(mail.subject).toContain("Ricevuto");
    expect(mail.body).toContain("ritiro a nome Nome ritiro");
    expect(mail.body).toContain("20:00");
    expect(mail.body).toContain("Totale indicativo:");
    expect(mail.body).toContain("Nessun addebito online");
  });
  it("comunica lo stato e il numero tavolo", () => {
    const mail = buildOrderEmail({ ...order, channel: "TABLE", tableNumber: 7 }, "READY", "");
    expect(mail.body).toContain("Tavolo 7");
    expect(mail.subject).toContain("Pronto");
  });
  it("usa l’importo definitivo e distingue il pagamento", () => {
    const final = { ...order, finalCents: 2750 };
    expect(buildOrderEmail(final, "FINAL", "").body).toContain("Totale definitivo:");
    expect(buildOrderEmail(final, "FINAL", "").body).toContain("27,50");
    const paid = buildOrderEmail(final, "PAID", "");
    expect(paid.body).toContain("Pagamento registrato dal personale");
    expect(paid.body).toContain("non sostituisce il documento fiscale");
    expect(paid.body).not.toContain("Nessun addebito online");
  });
  it("non include collegamenti senza URL pubblico HTTPS", () => {
    expect(buildOrderEmail(order, "RECEIVED", "").body).not.toContain("Segui l’ordine");
    expect(buildOrderEmail(order, "RECEIVED", "http://localhost").body).not.toContain("Segui l’ordine");
    expect(buildOrderEmail(order, "RECEIVED", "https://restaurant.example/").body).toContain("https://restaurant.example/ordine/test-order");
  });
  it("descrive pezzatura definitiva e coperti senza richiedere pesatura", () => {
    const message = buildOrderEmail({ ...order, pricingPolicy: "FIXED_PORTIONS", finalCents: 4200,
      partySize: 3, coverCount: 3, coverUnitCents: 200,
      items: [{ quantity: 1, nameSnapshot: "Costata", cooking: null, estWeightGrams: 600, lineEstCents: 3600, lineFinalCents: 3600 }],
    }, "RECEIVED", "https://restaurant.example", true).body;
    expect(message).toContain("600 g"); expect(message).toContain("Coperti: 3");
    expect(message).toContain("42,00"); expect(message).toContain("prezzo della pezzatura scelta è definitivo");
    expect(message).not.toContain("pesate dal personale");
  });
  it("distingue Stripe incassato dalla disponibilità di pagamento", () => {
    expect(buildOrderEmail({ ...order, payments: [{ method: "STRIPE", status: "PAID" }] }, "PAID", "").body).toContain("confermato da Stripe");
    expect(buildOrderEmail(order, "FINAL", "https://restaurant.example", true).body).toContain("Puoi pagare online dal riepilogo");
  });
  it.each(["RECEIVED", "READY", "FINAL", "PAID"])("collega %s al destinatario cliente e alla chiave deduplicata", async event => {
    mocks.findUniqueOrThrow.mockResolvedValue({ ...order, finalCents: 2750, customer: { id: "customer", name: "Anagrafica", email: "customer@example.invalid" } });
    await sendOrderEmail(order.id, event);
    expect(mocks.notify).toHaveBeenCalledWith(expect.objectContaining({
      channel: "email", to: "customer@example.invalid", customerId: "customer",
      key: `order:test-order:${event}${event === "FINAL" ? ":2750" : ""}`,
    }));
    expect(mocks.notify).toHaveBeenCalledWith(expect.objectContaining({
      channel: "email", to: "vecciarimatera@gmail.com",
      key: `restaurant:order:test-order:${event}${event === "FINAL" ? ":2750" : ""}`,
    }));
  });
  it("avvisa comunque il locale in assenza di email cliente", async () => {
    mocks.findUniqueOrThrow.mockResolvedValue({ ...order, customer: null });
    expect(await sendOrderEmail(order.id)).toBeNull();
    expect(mocks.notify).toHaveBeenCalledTimes(1);
    expect(mocks.notify).toHaveBeenCalledWith(expect.objectContaining({ to: "vecciarimatera@gmail.com" }));
  });
  it("include recapiti, opzioni, note delle righe e indirizzo nella copia al locale", () => {
    const staff = buildRestaurantOrderEmail({ ...order,
      customer: { name: "Cliente", email: "customer@example.invalid", phone: "0000000000" },
      deliveryAddress: "Indirizzo fixture",
      items: [{ ...order.items[0], options: [{ name: "Contorno fixture" }], notes: "Nota riga fixture" }],
    }, buildOrderEmail(order, "RECEIVED", "").body);
    for (const text of ["customer@example.invalid", "0000000000", "Indirizzo fixture", "Contorno fixture", "Nota riga fixture", "ritiro a nome Nome ritiro"])
      expect(staff).toContain(text);
    expect(staff).not.toContain("Ciao Nome ritiro");
  });
  it.each(["WEIGHT_UPDATED", "PAYMENT_PENDING", "PAYMENT_CANCELLED", "PAYMENT_FAILED", "PAYMENT_EXPIRED", "PARTIAL_REFUND"])(
    "%s può avvisare soltanto il locale, con chiave specifica del tentativo", async event => {
      mocks.findUniqueOrThrow.mockResolvedValue({ ...order, customer: { id: "customer", name: "Cliente", email: "customer@example.invalid" } });
      await sendOrderEmail(order.id, event, { staffOnly: true, revision: "payment-fixture" });
      expect(mocks.notify).toHaveBeenCalledTimes(1);
      expect(mocks.notify).toHaveBeenCalledWith(expect.objectContaining({
        to: "vecciarimatera@gmail.com", key: `restaurant:order:test-order:${event}:payment-fixture`,
      }));
    });
  it("non descrive come non addebitato un ordine già pagato o rimborsato", () => {
    for (const event of ["READY", "SERVED"]) {
      const message = buildOrderEmail({ ...order, payments: [{ method: "STRIPE", status: "PAID" }] }, event, "", false).body;
      expect(message).toContain("confermato da Stripe");
      expect(message).not.toContain("Nessun addebito");
    }
    const refund = buildOrderEmail({ ...order, payments: [{ method: "STRIPE", status: "REFUNDED" }] }, "REFUNDED", "").body;
    expect(refund).toContain("Pagamento rimborsato");
    expect(refund).not.toContain("Nessun addebito");
    expect(refund).not.toContain("Puoi pagare online");
  });
});
