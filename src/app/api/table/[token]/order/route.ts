import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle, HttpError, rateLimit, clientIp } from "@/lib/api";
import { cartSchema, createOrder } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { z } from "zod";
import { customerOrderSchema, requestedPaymentAvailable } from "@/lib/checkout";
import { onlinePaymentsAvailable } from "@/lib/payment-policy";
import { sendOrderEmail } from "@/lib/order-email";

// POST /api/table/{token}/order — il tavolo è dedotto SOLO dal token segreto del QR.
export const POST = handle(async (req: Request, { params: pendingParams }: { params: Promise<{ token: string }> }) => {
  const params = await pendingParams;
  rateLimit(`order:${clientIp(req)}`, 10, 60_000);
  const qr = await db.qrCode.findUnique({ where: { token: params.token }, include: { table: true } });
  if (!qr?.active || qr.kind !== "TABLE" || !qr.table?.active) throw new HttpError(404, "QR non valido o disattivato");
  const s = await getSettings();
  if (!s.ordering.tableEnabled) throw new HttpError(403, "Gli ordini dal tavolo sono momentaneamente sospesi");
  const cart = cartSchema.merge(customerOrderSchema).extend({
    tableNumber: z.number().int().positive(),
    payment: z.enum(["AT_COUNTER", "STRIPE"]),
  }).parse(await req.json());
  if (cart.tableNumber !== qr.table.number) throw new HttpError(400, "Il numero non corrisponde al tavolo di questo QR");
  if (!requestedPaymentAvailable(cart.payment, s.ordering.stripeEnabled && onlinePaymentsAvailable()))
    throw new HttpError(503, "Pagamento online momentaneamente non disponibile. Puoi scegliere la cassa.");
  const customer = await db.customer.upsert({
    where: { email: cart.email }, update: { name: cart.name, phone: cart.phone },
    create: { name: cart.name, email: cart.email, phone: cart.phone },
  });
  const order = await createOrder(cart, { channel: "TABLE", tableNumber: qr.table.number, customerId: customer.id, customerName: cart.name,
    paymentMethod: cart.payment === "STRIPE" ? "STRIPE" : "AT_COUNTER" });
  if (!await db.consent.findFirst({ where: { customerId: customer.id, kind: "privacy", source: `ordine:${order.id}` } }))
    await db.consent.create({ data: { customerId: customer.id, kind: "privacy", granted: true, source: `ordine:${order.id}`, textVersion: "privacy-ordini-1" } });
  const notification = await sendOrderEmail(order.id);
  // Il token d'accesso allo stato ordine è l'id ordine (cuid non indovinabile) + token tavolo.
  return NextResponse.json({ id: order.id, number: order.number, totalCents: order.finalCents ?? order.estimatedCents,
    coverCount: order.coverCount, coverUnitCents: order.coverUnitCents,
    emailStatus: notification?.status ?? "not_available" });
});

// GET — ordini della sessione aperta del tavolo (stato visibile al cliente).
export const GET = handle(async (_req: Request, { params: pendingParams }: { params: Promise<{ token: string }> }) => {
  const params = await pendingParams;
  const qr = await db.qrCode.findUnique({ where: { token: params.token } });
  if (!qr?.active || !qr.tableId) throw new HttpError(404, "QR non valido");
  const session = await db.tableSession.findFirst({ where: { tableId: qr.tableId, closedAt: null }, orderBy: { openedAt: "desc" } });
  if (!session) return NextResponse.json({ orders: [] });
  const orders = await db.order.findMany({ where: { sessionId: session.id }, orderBy: { createdAt: "desc" },
    select: { id: true, number: true, status: true, estimatedCents: true, finalCents: true, hasWeighted: true, createdAt: true,
      coverCount: true, coverUnitCents: true, partySize: true,
      pricingPolicy: true,
      items: { select: { nameSnapshot: true, quantity: true, cooking: true, estWeightGrams: true, actualWeightGrams: true, lineFinalCents: true, lineEstCents: true } } } });
  return NextResponse.json({ orders });
});
