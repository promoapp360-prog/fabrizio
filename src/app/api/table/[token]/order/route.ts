import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle, HttpError, rateLimit, clientIp } from "@/lib/api";
import { cartSchema, createOrder } from "@/lib/orders";
import { getSettings } from "@/lib/settings";

// POST /api/table/{token}/order — il tavolo è dedotto SOLO dal token segreto del QR.
export const POST = handle(async (req: Request, { params }: { params: { token: string } }) => {
  rateLimit(`order:${clientIp(req)}`, 10, 60_000);
  const qr = await db.qrCode.findUnique({ where: { token: params.token }, include: { table: true } });
  if (!qr?.active || qr.kind !== "TABLE" || !qr.table?.active) throw new HttpError(404, "QR non valido o disattivato");
  const s = await getSettings();
  if (!s.ordering.tableEnabled) throw new HttpError(403, "Gli ordini dal tavolo sono momentaneamente sospesi");
  const cart = cartSchema.parse(await req.json());
  let session = await db.tableSession.findFirst({ where: { tableId: qr.tableId!, closedAt: null } });
  session ??= await db.tableSession.create({ data: { tableId: qr.tableId! } });
  const order = await createOrder(cart, { channel: "TABLE", sessionId: session.id, tableNumber: qr.table.number, paymentMethod: s.ordering.payAtTable ? "AT_TABLE" : "AT_COUNTER" });
  // Il token d'accesso allo stato ordine è l'id ordine (cuid non indovinabile) + token tavolo.
  return NextResponse.json({ id: order.id, number: order.number });
});

// GET — ordini della sessione aperta del tavolo (stato visibile al cliente).
export const GET = handle(async (_req: Request, { params }: { params: { token: string } }) => {
  const qr = await db.qrCode.findUnique({ where: { token: params.token } });
  if (!qr?.active || !qr.tableId) throw new HttpError(404, "QR non valido");
  const session = await db.tableSession.findFirst({ where: { tableId: qr.tableId, closedAt: null } });
  if (!session) return NextResponse.json({ orders: [] });
  const orders = await db.order.findMany({ where: { sessionId: session.id }, orderBy: { createdAt: "desc" },
    select: { id: true, number: true, status: true, estimatedCents: true, finalCents: true, hasWeighted: true, createdAt: true,
      items: { select: { nameSnapshot: true, quantity: true, cooking: true, actualWeightGrams: true, lineFinalCents: true, lineEstCents: true } } } });
  return NextResponse.json({ orders });
});
