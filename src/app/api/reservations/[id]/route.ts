import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle, HttpError, rateLimit, clientIp } from "@/lib/api";
import { notificationId } from "@/lib/notify";

// Unguessable receipt identifier; never expose customer contact details.
export const GET = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  rateLimit(`res-receipt:${clientIp(req)}`, 120, 60_000);
  const { id } = await params;
  const reservation = await db.reservation.findUnique({
    where: { id }, select: { code: true, status: true, startsAt: true, people: true },
  });
  if (!reservation) throw new HttpError(404, "Richiesta non trovata");
  const message = await db.notification.findUnique({ where: { id: notificationId(`reservation:${id}:RECEIVED`) }, select: { status: true } });
  return NextResponse.json({ ...reservation, emailStatus: message?.status ?? "not_available" }, { headers: { "Cache-Control": "no-store" } });
});
