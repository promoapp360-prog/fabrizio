import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { handle } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { sendReservationEmail } from "@/lib/reservation-email";

export const PATCH = handle(async (req: Request, { params: pendingParams }: { params: Promise<{ id: string }> }) => {
  const params = await pendingParams;
  const u = await requirePermission("reservations");
  const d = z.object({ status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "SEATED", "NO_SHOW", "COMPLETED", "WAITLIST"]).optional(), tableId: z.string().nullable().optional(), notes: z.string().max(500).optional() }).parse(await req.json());
  const r = await db.reservation.update({ where: { id: params.id }, data: d, include: { customer: true } });
  const entry = await audit(u.id, "reservation_update", "Reservation", r.id, d);
  await sendReservationEmail(r.id, "UPDATED", entry.id, d.status === "CONFIRMED" || d.status === "CANCELLED");
  return NextResponse.json(r);
});
