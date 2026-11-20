export type OnlinePaymentState = "unavailable" | "waiting_amount" | "waiting_restaurant" | "ready" | "pending" | "paid" | "refunded" | "cancelled";
type Payment = { method: string; status: string };
export type PayableOrder = {
  status: string; hasWeighted: boolean; finalCents: number | null;
  payments: Payment[];
};

export function onlinePaymentState(order: PayableOrder, enabled: boolean, timing: string): OnlinePaymentState {
  if (order.payments.some(p => p.status === "PAID")) return "paid";
  if (order.payments.some(p => p.status === "REFUNDED")) return "refunded";
  if (order.status === "CANCELLED") return "cancelled";
  if (order.payments.some(p => p.method === "STRIPE" && p.status === "PENDING")) return "pending";
  if (!enabled) return "unavailable";
  if (order.finalCents == null) return "waiting_amount";
  if (order.finalCents < 50 || order.finalCents > 99_999_999) return "unavailable";
  // Per i tagli a peso finalCents viene valorizzato solo da conferma esplicita dello staff.
  if (!order.hasWeighted && (order.status === "RECEIVED" || timing !== "ADVANCE" && !["READY", "SERVED"].includes(order.status)))
    return "waiting_restaurant";
  return "ready";
}

export function stripeConfigured() {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET || !process.env.STRIPE_EXPECTED_ACCOUNT_ID) return false;
  try { return new URL(process.env.PUBLIC_BASE_URL ?? "").protocol === "https:"; } catch { return false; }
}

// Le chiavi live non vengono usate per collaudare l'anteprima di sviluppo.
export const onlinePaymentsAvailable = () => stripeConfigured() &&
  (!/^(sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY ?? "") || process.env.NODE_ENV === "production");

export const hasOpenStripePayment = (payments: Payment[]) =>
  payments.some(p => p.method === "STRIPE" && p.status === "PENDING");
