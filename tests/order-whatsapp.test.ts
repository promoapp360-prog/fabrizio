import { afterEach, describe, expect, it, vi } from "vitest";
import { initialReceiptPaymentChoice, orderMessagePayment, readOrderWhatsAppDraft, saveOrderWhatsAppDraft } from "../src/lib/order-whatsapp";
import type { OnlinePaymentState } from "../src/lib/payment-policy";

const order = (overrides = {}) => ({
  status: "RECEIVED", paymentMethod: "STRIPE", onlinePayment: "ready" as OnlinePaymentState,
  payments: [] as { status: string; method: string }[], ...overrides,
});
afterEach(() => vi.unstubAllGlobals());

describe("WhatsApp after payment", () => {
  it("does not mistake an old cash default for a completed payment step", () => {
    const draft = { createdAt: Date.now(), payment: "AT_COUNTER" as const, autoRequested: true, attemptedStates: [] };
    expect(initialReceiptPaymentChoice(draft, new URLSearchParams())).toBe("server");
    expect(initialReceiptPaymentChoice({ ...draft, counterConfirmed: true }, new URLSearchParams())).toBe("AT_COUNTER");
    expect(initialReceiptPaymentChoice({ ...draft, counterConfirmed: true }, new URLSearchParams("pay=online"))).toBe("STRIPE");
    expect(initialReceiptPaymentChoice({ ...draft, counterConfirmed: true }, new URLSearchParams("pagamento=verifica"))).toBe("STRIPE");
  });
  it("does not send before Stripe payment, even after a return URL or an unsuccessful attempt", () => {
    vi.stubGlobal("window", { location: { search: "?pagamento=verifica&paid=true" } });
    expect(orderMessagePayment(order())).toBeNull();
    expect(orderMessagePayment(order({ payments: [{ status: "FAILED", method: "STRIPE" }] }))).toBeNull();
  });
  it("requires both server-confirmed status and a recorded payment to say paid", () => {
    expect(orderMessagePayment(order({ onlinePayment: "paid" }))).toBeNull();
    expect(orderMessagePayment(order({ onlinePayment: "paid", payments: [{ status: "PAID", method: "STRIPE" }] }))).toBe("STRIPE_PAID");
    expect(orderMessagePayment(order({ onlinePayment: "paid", payments: [{ status: "PAID", method: "CASH" }] }))).toBe("CASH_PAID");
  });
  it.each(["AT_COUNTER", "ON_PICKUP"])("requires a final cash choice even if the order defaults to %s", paymentMethod => {
    expect(orderMessagePayment(order({ paymentMethod }))).toBeNull();
    expect(orderMessagePayment(order({ paymentMethod }), "AT_COUNTER")).toBe("AT_COUNTER");
    expect(orderMessagePayment(order({ paymentMethod }), "STRIPE")).toBeNull();
  });
  it("allows an explicit cash choice but not while Stripe is still pending", () => {
    expect(orderMessagePayment(order(), "AT_COUNTER")).toBe("AT_COUNTER");
    expect(orderMessagePayment(order({ onlinePayment: "pending" }), "AT_COUNTER")).toBeNull();
    expect(orderMessagePayment(order({ payments: [{ status: "PENDING", method: "STRIPE" }] }), "AT_COUNTER")).toBeNull();
  });
  it.each(["cancelled", "refunded"] as const)("does not open an order message when %s", onlinePayment => {
    expect(orderMessagePayment(order({ onlinePayment }), "AT_COUNTER")).toBeNull();
  });
  it("does not send a cancelled order even with a historic payment", () => {
    expect(orderMessagePayment(order({ status: "CANCELLED", onlinePayment: "paid", payments: [{ status: "PAID", method: "STRIPE" }] }))).toBeNull();
  });
  it("remembers attempted states and private details only in session storage", () => {
    const values = new Map<string, string>();
    vi.stubGlobal("window", { sessionStorage: { getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value) } });
    saveOrderWhatsAppDraft("fixture", { createdAt: Date.now(), payment: "STRIPE", autoRequested: true, attemptedStates: ["STRIPE_PAID"],
      returnPath: "/t/fixture", details: { pickupName: "Cliente verifica", notes: "senza sale", items: [{ name: "Costata", quantity: 1, weightGrams: 600, options: ["Patate"] }] } });
    const draft = readOrderWhatsAppDraft("fixture");
    expect(draft?.attemptedStates).toEqual(["STRIPE_PAID"]);
    expect(draft?.details?.items[0].options).toEqual(["Patate"]);
    expect(draft?.returnPath).toBe("/t/fixture");
    expect([...values.values()].join("")).not.toMatch(/email|telefono/i);
  });
  it("keeps the receipt usable if browser storage is blocked", () => {
    vi.stubGlobal("window", { get sessionStorage() { throw Error("blocked"); } });
    expect(readOrderWhatsAppDraft("fixture")).toBeNull();
    expect(() => saveOrderWhatsAppDraft("fixture", { createdAt: Date.now(), payment: "AT_COUNTER", autoRequested: true, attemptedStates: [] })).not.toThrow();
  });
  it("discards expired or malformed drafts instead of breaking the receipt", () => {
    let value = JSON.stringify({ createdAt: Date.now(), payment: "STRIPE", details: { pickupName: "Verifica", notes: "", items: "invalid" } });
    vi.stubGlobal("window", { sessionStorage: { getItem: () => value } });
    expect(readOrderWhatsAppDraft("fixture")).toBeNull();
    value = JSON.stringify({ createdAt: Date.now() - 25 * 60 * 60 * 1000, payment: "AT_COUNTER" });
    expect(readOrderWhatsAppDraft("fixture")).toBeNull();
  });
});
