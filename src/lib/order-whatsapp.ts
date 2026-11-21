import type { OnlinePaymentState } from "./payment-policy";
import type { WhatsAppOrderLine } from "./whatsapp-draft";

export type OrderMessagePayment = "STRIPE_PAID" | "CASH_PAID" | "AT_COUNTER";
export type OrderPaymentChoice = "server" | "STRIPE" | "AT_COUNTER";

export function orderMessagePayment(order: {
  status: string; paymentMethod: string; onlinePayment: OnlinePaymentState;
  payments: { status: string; method: string }[];
}, choice: OrderPaymentChoice = "server"): OrderMessagePayment | null {
  if (order.status === "CANCELLED" || order.onlinePayment === "refunded" || order.onlinePayment === "cancelled") return null;
  // URL parameters and a selected payment method are never proof of payment.
  if (order.onlinePayment === "paid" && order.payments.some(payment => payment.status === "PAID"))
    return order.payments.some(payment => payment.status === "PAID" && payment.method === "STRIPE") ? "STRIPE_PAID" : "CASH_PAID";
  if (order.onlinePayment === "paid") return null;
  if (order.onlinePayment === "pending" || order.payments.some(payment => payment.status === "PENDING")) return null;
  if (choice === "STRIPE" || choice === "server" && order.paymentMethod === "STRIPE") return null;
  return choice === "AT_COUNTER" || ["AT_COUNTER", "ON_PICKUP", "CASH"].includes(order.paymentMethod) ? "AT_COUNTER" : null;
}

export type OrderWhatsAppDraft = {
  createdAt: number;
  payment: "STRIPE" | "AT_COUNTER";
  autoRequested: boolean;
  attemptedStates: OrderMessagePayment[];
  details?: { pickupName: string; address?: string; notes: string; items: WhatsAppOrderLine[] };
  returnPath?: string;
};
const key = (id: string) => `vecciari-order-whatsapp:${id}`;
const states: OrderMessagePayment[] = ["STRIPE_PAID", "CASH_PAID", "AT_COUNTER"];

export function readOrderWhatsAppDraft(id: string): OrderWhatsAppDraft | null {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(key(id)) ?? "null");
    if (!value || !Number.isFinite(value.createdAt) || Date.now() - value.createdAt > 24 * 60 * 60 * 1000 ||
      !["STRIPE", "AT_COUNTER"].includes(value.payment)) return null;
    if (value.details && (typeof value.details.pickupName !== "string" || typeof value.details.notes !== "string" ||
      !Array.isArray(value.details.items) || value.details.items.some((item: WhatsAppOrderLine) =>
        !item || typeof item.name !== "string" || !Number.isInteger(item.quantity) || item.quantity < 1 ||
        item.options != null && (!Array.isArray(item.options) || item.options.some(option => typeof option !== "string")) ||
        item.cooking != null && typeof item.cooking !== "string" || item.notes != null && typeof item.notes !== "string" ||
        item.weightGrams != null && (!Number.isInteger(item.weightGrams) || item.weightGrams < 1)))) return null;
    return { ...value, attemptedStates: Array.isArray(value.attemptedStates) ? value.attemptedStates.filter((state: OrderMessagePayment) => states.includes(state)) : [],
      returnPath: typeof value.returnPath === "string" && /^\/t\/[a-zA-Z0-9._-]+$/.test(value.returnPath) ? value.returnPath : undefined };
  } catch { return null; }
}

export function saveOrderWhatsAppDraft(id: string, value: OrderWhatsAppDraft): void {
  // Contact data stay in this browser tab, not in a URL, public API, or server log.
  // If storage is blocked, the receipt still provides the canonical order summary.
  try { window.sessionStorage.setItem(key(id), JSON.stringify(value)); } catch { /* Manual receipt fallback remains available. */ }
}
