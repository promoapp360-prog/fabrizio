import { describe, expect, it } from "vitest";
import { onlinePaymentState, hasOpenStripePayment } from "../src/lib/payment-policy";
const order = { status: "CONFIRMED", hasWeighted: true, finalCents: null as number | null, payments: [] as { method: string; status: string }[] };
describe("pagamento dell’importo definitivo", () => {
  it("non addebita mai il totale stimato", () => expect(onlinePaymentState(order, true, "ADVANCE")).toBe("waiting_amount"));
  it("consente la carne a peso soltanto dopo conferma finale", () =>
    expect(onlinePaymentState({ ...order, finalCents: 4200 }, true, "END")).toBe("ready"));
  it("rispetta il momento del pagamento dei prezzi fissi", () => {
    const fixed = { ...order, hasWeighted: false, finalCents: 1500 };
    expect(onlinePaymentState(fixed, true, "END")).toBe("waiting_restaurant");
    expect(onlinePaymentState(fixed, true, "ADVANCE")).toBe("ready");
    expect(onlinePaymentState({ ...fixed, status: "READY" }, true, "END")).toBe("ready");
    expect(onlinePaymentState({ ...fixed, status: "RECEIVED" }, true, "ADVANCE")).toBe("waiting_restaurant");
  });
  it("mantiene visibile il pagamento aperto anche se Stripe è sospeso", () => {
    const pending = [{ method: "STRIPE", status: "PENDING" }];
    expect(hasOpenStripePayment(pending)).toBe(true);
    expect(onlinePaymentState({ ...order, payments: pending }, false, "END")).toBe("pending");
  });
  it.each(["PAID", "REFUNDED"])("impedisce nuovi pagamenti dopo %s", status =>
    expect(onlinePaymentState({ ...order, payments: [{ method: "STRIPE", status }] }, true, "END")).toBe(status === "PAID" ? "paid" : "refunded"));
  it("blocca ordini annullati, configurazione incompleta e importi sotto il minimo", () => {
    expect(onlinePaymentState({ ...order, status: "CANCELLED" }, true, "END")).toBe("cancelled");
    expect(onlinePaymentState(order, false, "END")).toBe("unavailable");
    expect(onlinePaymentState({ ...order, finalCents: 10 }, true, "END")).toBe("unavailable");
  });
});
