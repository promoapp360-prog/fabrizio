import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { handle } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { resCode } from "@/lib/util";
import { audit } from "@/lib/audit";

// GET ?from&to → elenco calendario. POST → prenotazione telefonica/walk-in (lo staff può forzare).
export const GET = handle(async (req: Request) => {
  await requirePermission("reservations");
  const u = new URL(req.url); const from = new Date(u.searchParams.get("from") ?? Date.now()); const to = new Date(u.searchParams.get("to") ?? from.getTime() + 7 * 86400000);
  return NextResponse.json(await db.reservation.findMany({ where: { startsAt: { gte: from, lt: to } }, include: { customer: true, table: true }, orderBy: { startsAt: "asc" } }));
});
export const POST = handle(async (req: Request) => {
  const u = await requirePermission("reservations");
  const d = z.object({ name: z.string().min(2), phone: z.string().min(6), startsAt: z.coerce.date(), people: z.number().int().min(1), tableId: z.string().optional(), notes: z.string().optional(), source: z.enum(["phone", "walk-in"]).default("phone"), status: z.enum(["CONFIRMED", "WAITLIST", "SEATED"]).default("CONFIRMED") }).parse(await req.json());
  const c = await db.customer.create({ data: { name: d.name, phone: d.phone } });
  const r = await db.reservation.create({ data: { code: resCode(), customerId: c.id, startsAt: d.startsAt, endsAt: new Date(d.startsAt.getTime() + 2 * 3600_000), people: d.people, tableId: d.tableId, notes: d.notes, source: d.source, status: d.status } });
  await audit(u.id, "reservation_manual", "Reservation", r.id);
  return NextResponse.json(r, { status: 201 });
});
