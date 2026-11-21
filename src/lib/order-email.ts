import { db } from "./db";
import { sendCommercialEmails } from "./commercial-email";
import { formatEUR } from "./pricing";
import { STATUS_LABEL } from "./orders";
import type { Customer, Order, OrderItem } from "@prisma/client";
import { getSettings } from "./settings";
import { onlinePaymentsAvailable } from "./payment-policy";
import { PORTION_NOTICE } from "./portions";

export type OrderEmailData = Pick<Order, "id" | "number" | "channel" | "tableNumber" | "customerName" | "pickupAt" | "finalCents" | "estimatedCents" | "hasWeighted" | "notes"> & {
  pricingPolicy?: string; coverCount?: number; coverUnitCents?: number; partySize?: number;
  customer: (Pick<Customer, "name"> & Partial<Pick<Customer, "email" | "phone">>) | null;
  deliveryAddress?: string | null;
  items: (Pick<OrderItem, "quantity" | "nameSnapshot" | "cooking" | "lineFinalCents" | "lineEstCents"> & {
    estWeightGrams?: number | null; actualWeightGrams?: number | null; notes?: string | null; options?: unknown;
  })[];
  payments?: { method: string; status: string }[];
};

export async function sendOrderEmail(orderId: string, event = "RECEIVED", options: { staffOnly?: boolean; revision?: string; detail?: string } = {}) {
  const order = await db.order.findUniqueOrThrow({
    where: { id: orderId }, include: { customer: true, items: true, payments: true },
  });
  const settings = await getSettings();
  const { subject, body } = buildOrderEmail(order, event, process.env.PUBLIC_BASE_URL, settings.ordering.stripeEnabled && onlinePaymentsAvailable());
  const key = `order:${order.id}:${event}${event === "FINAL" ? `:${order.finalCents}` : ""}${options.revision ? `:${options.revision}` : ""}`;
  const result = await sendCommercialEmails(!options.staffOnly && order.customer?.email ? {
    to: order.customer.email, customerId: order.customer.id, subject, body, key,
  } : null, {
    key, subject, customerId: order.customer?.id,
    body: [buildRestaurantOrderEmail(order, body), options.detail].filter(Boolean).join("\n"),
  });
  return result.customer;
}

export function buildRestaurantOrderEmail(order: OrderEmailData, customerBody: string) {
  return [
    "Evento commerciale — Vecciarì",
    `Cliente / ritiro: ${order.customerName || order.customer?.name || "Cliente al tavolo"}`,
    order.customer?.phone ? `Telefono cliente: ${order.customer.phone}` : "",
    order.customer?.email ? `Email cliente: ${order.customer.email}` : "",
    order.deliveryAddress ? `Indirizzo di consegna: ${order.deliveryAddress}` : "",
    // Il riepilogo completo è lo stesso del cliente, senza il saluto personale.
    customerBody.split("\n").slice(1).join("\n"),
    ...order.items.flatMap(item => {
      const options = Array.isArray(item.options) ? item.options.flatMap(option =>
        option && typeof option === "object" && typeof option.name === "string" ? [option.name] : []) : [];
      return [
        options.length ? `${item.nameSnapshot} · Opzioni: ${options.join(", ")}` : "",
        item.notes ? `${item.nameSnapshot} · Note: ${item.notes}` : "",
      ];
    }),
  ].filter(Boolean).join("\n");
}

export function buildOrderEmail(order: OrderEmailData, event: string, baseUrl = process.env.PUBLIC_BASE_URL, online = false) {
  const name = order.customerName || order.customer?.name || "Cliente";
  const mode = order.channel === "TABLE" ? `Tavolo ${order.tableNumber}` : order.channel === "TAKEAWAY" ? `Asporto · ritiro a nome ${name}` : "Consegna";
  const extra: Record<string, string> = {
    PAID: "Pagamento registrato", FINAL: "Importo definitivo confermato", REFUNDED: "Pagamento rimborsato",
    WEIGHT_UPDATED: "Peso aggiornato", PAYMENT_PENDING: "Pagamento online avviato",
    PAYMENT_CANCELLED: "Tentativo di pagamento online annullato", PAYMENT_FAILED: "Pagamento online non completato",
    PAYMENT_EXPIRED: "Tentativo di pagamento online scaduto",
    PARTIAL_REFUND: "Rimborso parziale ricevuto da Stripe",
  };
  const status = extra[event] ?? STATUS_LABEL[event] ?? event;
  const paid = order.payments?.find(payment => payment.status === "PAID");
  const refunded = order.payments?.some(payment => payment.status === "REFUNDED");
  const pending = order.payments?.some(payment => payment.method === "STRIPE" && payment.status === "PENDING");
  const total = order.finalCents ?? order.estimatedCents;
  const base = baseUrl?.replace(/\/$/, "");
  const body = [
    `Ciao ${name},`, "", `Vecciarì — ordine n° ${order.number}`, mode,
    `Stato: ${status}`,
    order.pickupAt ? `Ritiro: ${order.pickupAt.toLocaleString("it-IT", { timeZone: "Europe/Rome" })} (ora italiana)` : "",
    "", ...order.items.map(i => {
      const grams = order.pricingPolicy === "FIXED_PORTIONS" ? i.estWeightGrams : i.actualWeightGrams;
      return `${i.quantity} × ${i.nameSnapshot}${grams ? ` · ${grams} g` : ""}${i.cooking ? ` · ${i.cooking}` : ""} — ${formatEUR(i.lineFinalCents ?? i.lineEstCents)}`;
    }),
    order.partySize ? `Persone: ${order.partySize}` : "",
    order.coverCount ? `Coperti: ${order.coverCount} × ${formatEUR(order.coverUnitCents ?? 0)} = ${formatEUR(order.coverCount * (order.coverUnitCents ?? 0))}` : "",
    "", `Totale ${order.finalCents == null ? "indicativo" : "definitivo"}: ${formatEUR(total)}`,
    order.hasWeighted && order.finalCents == null ? "Le carni a peso vengono pesate dal personale: il totale sarà confermato prima del pagamento." : "",
    order.hasWeighted && order.pricingPolicy === "FIXED_PORTIONS" ? PORTION_NOTICE : "",
    refunded || event === "REFUNDED" ? "Pagamento rimborsato. Questa email non sostituisce il documento fiscale."
      : paid || event === "PAID" ? paid?.method === "STRIPE"
      ? "Pagamento online confermato da Stripe. Questa email non sostituisce il documento fiscale."
      : "Pagamento registrato dal personale. Questa email non sostituisce il documento fiscale."
      : pending ? "Pagamento online in attesa di conferma. Non risulta ancora incassato: non pagare nuovamente finché il tentativo non è concluso o annullato."
      : online ? "Puoi pagare online dal riepilogo ordine quando l’importo definitivo è confermato e il pagamento è disponibile, oppure alla cassa."
      : "Pagamento alla cassa del ristorante. Nessun addebito online è stato eseguito.",
    order.notes ? `Note: ${order.notes}` : "",
    base && /^https:\/\//.test(base) ? `Segui l’ordine: ${base}/ordine/${order.id}` : "",
    "", "Vecciarì — Via XX Settembre 14, 75100 Matera", "Prenotazioni e assistenza: +39 393 138 0073",
  ].filter(Boolean).join("\n");
  return { subject: `Vecciarì · Ordine ${order.number} · ${status}`, body };
}
