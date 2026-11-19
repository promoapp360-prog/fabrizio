import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { handle, HttpError } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { STATUS_FLOW } from "@/lib/orders";
import { lineCents, type PriceMode } from "@/lib/pricing";
import { audit } from "@/lib/audit";
import { can } from "@/lib/rbac";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("status"), status: z.enum(["CONFIRMED", "PREPARING", "READY", "SERVED", "CANCELLED"]) }),
  z.object({ action: z.literal("weight"), itemId: z.string(), grams: z.number().int().min(1).max(5000) }),
  z.object({ action: z.literal("confirmFinal") }),
  z.object({ action: z.literal("payment"), method: z.enum(["AT_TABLE", "AT_COUNTER", "ON_PICKUP"]), amountCents: z.number().int().min(1) }),
]);

export const PATCH = handle(async (req: Request, { params: pendingParams }: { params: Promise<{ id: string }> }) => {
  const params = await pendingParams;
  const user = await requirePermission("orders.view");
  const body = schema.parse(await req.json());
  const order = await db.order.findUniqueOrThrow({ where: { id: params.id }, include: { items: true } });

  if (body.action === "status") {
    // Cucina: solo avanzamento preparazione. Sala/Responsabile: tutto il flusso.
    const kitchenOnly = !can(user.role, "orders.manage");
    if (kitchenOnly && !["PREPARING", "READY"].includes(body.status)) throw new HttpError(403, "Permesso negato");
    if (!STATUS_FLOW[order.status].includes(body.status)) throw new HttpError(409, `Passaggio non consentito da ${order.status} a ${body.status}`);
    // Aggiornamento condizionale: evita che due operatori sovrascrivano lo stesso stato.
    const r = await db.order.updateMany({ where: { id: order.id, status: order.status }, data: { status: body.status } });
    if (!r.count) throw new HttpError(409, "Ordine aggiornato da un altro operatore, ricarica");
    await db.orderEvent.create({ data: { orderId: order.id, status: body.status, userId: user.id } });
    await audit(user.id, `order_${body.status.toLowerCase()}`, "Order", order.id);
    return NextResponse.json({ ok: true });
  }
  if (body.action === "weight") {
    const it = order.items.find(i => i.id === body.itemId);
    if (!it) throw new HttpError(404, "Riga non trovata");
    const fin = lineCents({ priceMode: it.priceMode as PriceMode, unitCents: it.unitCents, optionsCents: it.optionsCents, quantity: it.quantity, weightGrams: body.grams });
    await db.orderItem.update({ where: { id: it.id }, data: { actualWeightGrams: body.grams, lineFinalCents: fin, weightConfirmed: false } });
    await audit(user.id, "weight_set", "OrderItem", it.id, { grams: body.grams });
    return NextResponse.json({ lineFinalCents: fin });
  }
  await requirePermission("orders.payments");
  if (body.action === "confirmFinal") {
    // Importo definitivo: comunicato al cliente e confermato prima dell'addebito.
    const items = await db.orderItem.findMany({ where: { orderId: order.id } });
    if (items.some(i => i.estWeightGrams != null && i.actualWeightGrams == null)) throw new HttpError(400, "Inserisci il peso effettivo di tutti i tagli a peso");
    const total = items.reduce((s, i) => s + (i.lineFinalCents ?? i.lineEstCents), 0) + (order.channel === "DELIVERY" ? order.estimatedCents - order.items.reduce((s, i) => s + i.lineEstCents, 0) : 0);
    await db.$transaction([
      db.orderItem.updateMany({ where: { orderId: order.id }, data: { weightConfirmed: true } }),
      db.order.update({ where: { id: order.id }, data: { finalCents: total } }),
    ]);
    await audit(user.id, "final_confirmed", "Order", order.id, { total });
    return NextResponse.json({ finalCents: total });
  }
  // Pagamento registrato manualmente (contanti/POS). Nessun dato carta viene salvato.
  if (order.finalCents == null) throw new HttpError(400, "Conferma prima l'importo definitivo");
  const p = await db.payment.create({ data: { orderId: order.id, method: body.method, status: "PAID", amountCents: body.amountCents, recordedBy: user.id } });
  await audit(user.id, "payment_recorded", "Order", order.id, { amount: body.amountCents, method: body.method });
  return NextResponse.json(p);
});
