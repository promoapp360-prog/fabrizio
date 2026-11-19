import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notificationId } from "@/lib/notify";
import { handle, HttpError } from "@/lib/api";
// Stato ordine pubblico: espone solo dati non sensibili.
export const GET = handle(async (_r: Request, { params: pendingParams }: { params: Promise<{ id: string }> }) => {
  const params = await pendingParams;
  const o = await db.order.findUnique({ where: { id: params.id }, select: {
    number: true, status: true, channel: true, tableNumber: true, estimatedCents: true,
    finalCents: true, hasWeighted: true, pickupAt: true, paymentMethod: true,
    items: { select: { nameSnapshot: true, quantity: true, cooking: true, lineEstCents: true, lineFinalCents: true } },
    payments: { select: { status: true } },
  } });
  if (!o) throw new HttpError(404, "Ordine non trovato");
  const notification = await db.notification.findUnique({ where: { id: notificationId(`order:${params.id}:RECEIVED`) }, select: { status: true } });
  return NextResponse.json({ ...o, emailStatus: notification?.status ?? "not_available" }, { headers: { "Cache-Control": "no-store" } });
});
