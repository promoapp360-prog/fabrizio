import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { handle, HttpError } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { STATUS_FLOW } from "@/lib/orders";
import { lineCents, type PriceMode, isWeighted } from "@/lib/pricing";
import { audit } from "@/lib/audit";
import { can } from "@/lib/rbac";
import { sendOrderEmail } from "@/lib/order-email";
import { hasOpenStripePayment } from "@/lib/payment-policy";
import { cancelCheckout } from "@/lib/stripe-payments";
import { FIXED_PORTIONS } from "@/lib/portions";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("status"), status: z.enum(["CONFIRMED", "PREPARING", "READY", "SERVED", "CANCELLED"]) }),
  z.object({ action: z.literal("weight"), itemId: z.string(), grams: z.number().int().min(1).max(5000) }),
  z.object({ action: z.literal("confirmFinal") }),
  z.object({ action: z.literal("payment"), method: z.enum(["AT_TABLE", "AT_COUNTER", "ON_PICKUP"]), amountCents: z.number().int().min(1) }),
  z.object({ action: z.literal("retryEmail") }),
  z.object({ action: z.literal("cancelOnline") }),
]);

export const PATCH = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const user = await requirePermission("orders.view");
  const body = schema.parse(await req.json());
  if (body.action === "retryEmail") {
    await requirePermission("orders.manage");
    const notification = await sendOrderEmail(id);
    return NextResponse.json({ status: notification?.status ?? "not_available" });
  }
  if (body.action === "cancelOnline") {
    await requirePermission("orders.payments");
    const result = await cancelCheckout(id);
    await audit(user.id, "order_cancel_online", "Order", id);
    return NextResponse.json(result);
  }
  if (body.action === "status" && !can(user.role, "orders.manage") && !["PREPARING", "READY"].includes(body.status))
    throw new HttpError(403, "Permesso negato");
  if (body.action === "payment" || body.action === "confirmFinal") await requirePermission("orders.payments");

  const result = await db.$transaction(async tx => {
    // Same table lock as order creation: cancellation cannot race a cover allocation.
    const location = await tx.order.findUnique({ where: { id }, select: { tableNumber: true } });
    if (location?.tableNumber)
      await tx.$queryRaw`SELECT id FROM "Table" WHERE number = ${location.tableNumber} FOR UPDATE`;
    // Row lock serializes concurrent payments, weights and confirmations.
    const order = await tx.order.update({ where: { id }, data: { updatedAt: new Date() }, include: { items: true, payments: true } });
    const paid = order.payments.find(p => p.status === "PAID");
    if (hasOpenStripePayment(order.payments) && (["weight", "confirmFinal", "payment"].includes(body.action) ||
      body.action === "status" && body.status === "CANCELLED"))
      throw new HttpError(409, "Pagamento online aperto: annullalo prima di modificare importo, annullare l’ordine o incassare alla cassa.");
    if (order.payments.some(p => p.status === "REFUNDED") && ["weight", "confirmFinal", "payment"].includes(body.action))
      throw new HttpError(409, "Ordine rimborsato: crea un nuovo ordine senza modificare lo storico.");
    if (body.action === "status") {
      if (!STATUS_FLOW[order.status].includes(body.status)) throw new HttpError(409, "Stato già aggiornato o passaggio non consentito");
      if (paid && body.status === "CANCELLED") throw new HttpError(409, "Ordine già pagato: gestisci prima lo storno con il responsabile");
      if (body.status === "CANCELLED" && order.coverCount > 0 && order.diningGroupKey &&
        await tx.order.count({ where: { sessionId: order.sessionId, diningGroupKey: order.diningGroupKey, id: { not: id }, status: { not: "CANCELLED" } } }))
        throw new HttpError(409, "Prima annulla gli ordini aggiuntivi del gruppo, per non perdere i coperti già conteggiati.");
      await tx.order.update({ where: { id }, data: { status: body.status } });
      await tx.orderEvent.create({ data: { orderId: id, status: body.status, userId: user.id } });
      return { data: { ok: true }, emailEvent: body.status };
    }
    if (order.status === "CANCELLED") throw new HttpError(409, "Ordine annullato");
    if (order.pricingPolicy === FIXED_PORTIONS && ["weight", "confirmFinal"].includes(body.action))
      throw new HttpError(409, "Pezzatura a prezzo definitivo: il peso effettivo non modifica l’importo concordato.");
    if (body.action === "weight") {
      if (paid) throw new HttpError(409, "Non puoi modificare il peso di un ordine pagato");
      const item = order.items.find(i => i.id === body.itemId);
      if (!item || !isWeighted(item.priceMode as PriceMode)) throw new HttpError(400, "Riga non a peso");
      const total = lineCents({ priceMode: item.priceMode as PriceMode, unitCents: item.unitCents, optionsCents: item.optionsCents, quantity: item.quantity, weightGrams: body.grams });
      await tx.orderItem.update({ where: { id: item.id }, data: { actualWeightGrams: body.grams, lineFinalCents: total, weightConfirmed: false } });
      await tx.order.update({ where: { id }, data: { finalCents: null } });
      return { data: { lineFinalCents: total }, emailEvent: null };
    }
    if (body.action === "confirmFinal") {
      if (paid) throw new HttpError(409, "Ordine già pagato");
      if (order.items.some(i => isWeighted(i.priceMode as PriceMode) && i.actualWeightGrams == null))
        throw new HttpError(400, "Inserisci il peso effettivo di tutti i tagli a peso");
      const deliveryFee = order.channel === "DELIVERY" ? order.estimatedCents - order.items.reduce((s, i) => s + i.lineEstCents, 0) : 0;
      const total = order.items.reduce((s, i) => s + (i.lineFinalCents ?? i.lineEstCents), 0) + deliveryFee;
      await tx.orderItem.updateMany({ where: { orderId: id }, data: { weightConfirmed: true } });
      await tx.order.update({ where: { id }, data: { finalCents: total } });
      return { data: { finalCents: total }, emailEvent: "FINAL" };
    }
    if (order.finalCents == null) throw new HttpError(400, "Conferma prima l’importo definitivo dopo la pesatura");
    if (body.amountCents !== order.finalCents) throw new HttpError(400, "L’importo deve corrispondere al totale definitivo");
    if (paid) {
      if (paid.amountCents !== body.amountCents || paid.method !== body.method) throw new HttpError(409, "Pagamento già registrato con dati diversi");
      return { data: paid, emailEvent: "PAID" };
    }
    const payment = await tx.payment.create({ data: { orderId: id, method: body.method, status: "PAID", amountCents: body.amountCents, recordedBy: user.id } });
    return { data: payment, emailEvent: "PAID" };
  });
  const entry = await audit(user.id, `order_${body.action}`, "Order", id);
  if (result.emailEvent) await sendOrderEmail(id, result.emailEvent);
  else if (body.action === "weight") await sendOrderEmail(id, "WEIGHT_UPDATED", { staffOnly: true, revision: entry.id });
  return NextResponse.json(result.data);
});
