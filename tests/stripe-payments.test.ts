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
  order = { id: "order_fixture", number: 42, status: "CONFIRMED", hasWeighted: true, finalCents: 4200, payments: [] };
  session = { id: "cs_test_fixture", status: "open", payment_status: "unpaid", amount_total: 4200, currency: "eur",
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
  m.stripe.mockImplementation(async path => path.startsWith("/prices?") ? { data: [{ id: "price_fixture", currency: "eur", unit_amount: 4200, product: "vecciari_order_balance", type: "one_time" }] } :
    path.endsWith("/expire") ? { ...session, status: "expired" } : session);
});
afterEach(() => vi.unstubAllEnvs());
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
