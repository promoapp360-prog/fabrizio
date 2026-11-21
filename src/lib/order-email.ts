import { db } from "./db";
import { notify } from "./notify";
import { formatEUR } from "./pricing";
import { STATUS_LABEL } from "./orders";
import type { Customer, Order, OrderItem } from "@prisma/client";
import { getSettings } from "./settings";
import { onlinePaymentsAvailable } from "./payment-policy";
import { PORTION_NOTICE } from "./portions";

export type OrderEmailData = Pick<Order, "id" | "number" | "channel" | "tableNumber" | "customerName" | "pickupAt" | "finalCents" | "estimatedCents" | "hasWeighted" | "notes"> & {
  pricingPolicy?: string; coverCount?: number; coverUnitCents?: number; partySize?: number;
  customer: Pick<Customer, "name"> | null;
  items: (Pick<OrderItem, "quantity" | "nameSnapshot" | "cooking" | "lineFinalCents" | "lineEstCents"> & { estWeightGrams?: number | null; actualWeightGrams?: number | null })[];
  payments?: { method: string; status: string }[];
};

export async function sendOrderEmail(orderId: string, event = "RECEIVED") {
  const order = await db.order.findUniqueOrThrow({
    where: { id: orderId }, include: { customer: true, items: true, payments: true },
  });
  if (!order.customer?.email) return null;
  const settings = await getSettings();
  const { subject, body } = buildOrderEmail(order, event, process.env.PUBLIC_BASE_URL, settings.ordering.stripeEnabled && onlinePaymentsAvailable());
  return notify({
    channel: "email", to: order.customer.email, customerId: order.customer.id,
    subject, body, key: `order:${order.id}:${event}${event === "FINAL" ? `:${order.finalCents}` : ""}`,
  });
}

export function buildOrderEmail(order: OrderEmailData, event: string, baseUrl = process.env.PUBLIC_BASE_URL, online = false) {
  const name = order.customerName || order.customer?.name || "Cliente";
  const mode = order.channel === "TABLE" ? `Tavolo ${order.tableNumber}` : order.channel === "TAKEAWAY" ? `Asporto · ritiro a nome ${name}` : "Consegna";
  const status = event === "PAID" ? "Pagamento registrato" : event === "FINAL" ? "Importo definitivo confermato" : STATUS_LABEL[event] ?? event;
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
    event === "PAID" ? order.payments?.some(p => p.method === "STRIPE" && p.status === "PAID")
      ? "Pagamento online confermato da Stripe. Questa email non sostituisce il documento fiscale."
      : "Pagamento registrato dal personale. Questa email non sostituisce il documento fiscale."
      : online ? "Puoi pagare online dal riepilogo ordine quando l’importo definitivo è confermato e il pagamento è disponibile, oppure alla cassa."
      : "Pagamento alla cassa del ristorante. Nessun addebito online è stato eseguito.",
    order.notes ? `Note: ${order.notes}` : "",
    base && /^https:\/\//.test(base) ? `Segui l’ordine: ${base}/ordine/${order.id}` : "",
    "", "Vecciarì — Via XX Settembre 14, 75100 Matera", "Prenotazioni e assistenza: +39 393 138 0073",
  ].filter(Boolean).join("\n");
  return { subject: `Vecciarì · Ordine ${order.number} · ${status}`, body };
}
