import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { handle, HttpError, rateLimit, clientIp } from "@/lib/api";
import { findShift, checkCapacity, slotsForDay } from "@/lib/availability";
import { getSettings } from "@/lib/settings";
import { resCode } from "@/lib/util";
import { notify } from "@/lib/notify";

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), time: z.string().regex(/^\d{2}:\d{2}$/),
  people: z.number().int().min(1).max(40), name: z.string().min(2).max(80),
  email: z.string().email().optional().or(z.literal("")), phone: z.string().min(6).max(20),
  notes: z.string().max(500).optional(), privacy: z.literal(true), marketing: z.boolean().default(false),
  idempotencyKey: z.string().min(8).max(64),
});

// GET /api/reservations?date=YYYY-MM-DD → fasce orarie del giorno
export const GET = handle(async (req: Request) => {
  const date = new URL(req.url).searchParams.get("date");
  if (!date) throw new HttpError(400, "Data mancante");
  const day = new Date(`${date}T12:00:00`);
  const closed = await db.closure.findFirst({ where: { date: new Date(`${date}T00:00:00Z`) } });
  if (closed) return NextResponse.json({ slots: [], closed: closed.reason ?? "Chiuso" });
  return NextResponse.json({ slots: slotsForDay(await db.shift.findMany(), day) });
});

export const POST = handle(async (req: Request) => {
  rateLimit(`res:${clientIp(req)}`, 5, 60_000);
  const d = schema.parse(await req.json());
  const dup = await db.reservation.findUnique({ where: { idempotencyKey: d.idempotencyKey } });
  if (dup) return NextResponse.json({ code: dup.code, status: dup.status });
  const s = await getSettings();
  const startsAt = new Date(`${d.date}T${d.time}:00`);
  if (startsAt.getTime() < Date.now() + s.reservations.minNoticeMin * 60000) throw new HttpError(400, "Orario troppo vicino o già passato");
  if (await db.closure.findFirst({ where: { date: new Date(`${d.date}T00:00:00Z`) } })) throw new HttpError(409, "Il ristorante è chiuso in questa data");

  const shift = findShift(await db.shift.findMany(), startsAt);
  if (!shift) throw new HttpError(409, "Orario fuori dai turni di apertura");

  // Transazione serializzabile: due richieste concorrenti non possono superare la capienza.
  const result = await db.$transaction(async tx => {
    const dayStart = new Date(startsAt); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
    const existing = (await tx.reservation.findMany({ where: { startsAt: { gte: dayStart, lt: dayEnd } } }))
      .filter(r => findShift([shift], r.startsAt));
    const tables = await tx.table.findMany();
    const cap = checkCapacity({ shift, existing, people: d.people, tables, startsAt, durationMin: s.reservations.durationMin, maxPartyOnline: s.reservations.maxPartyOnline });
    if (!cap.ok) throw new HttpError(409, cap.reason);

    const email = d.email || null;
    const customer = email
      ? await tx.customer.upsert({ where: { email }, update: { name: d.name, phone: d.phone }, create: { name: d.name, email, phone: d.phone } })
      : await tx.customer.create({ data: { name: d.name, phone: d.phone } });
    await tx.consent.createMany({ data: [
      { customerId: customer.id, kind: "privacy", granted: true, source: "prenotazione web" },
      { customerId: customer.id, kind: "marketing_email", granted: d.marketing, source: "prenotazione web" },
    ] });
    return tx.reservation.create({ data: { code: resCode(), customerId: customer.id, startsAt, endsAt: new Date(startsAt.getTime() + s.reservations.durationMin * 60000),
      people: d.people, notes: d.notes, status: s.reservations.autoConfirm ? "CONFIRMED" : "PENDING", idempotencyKey: d.idempotencyKey } });
  }, { isolationLevel: "Serializable" });

  if (d.email) await notify({ channel: "email", to: d.email, subject: `Prenotazione ${result.code}`, customerId: result.customerId,
    body: `Grazie ${d.name}, abbiamo ricevuto la tua richiesta per ${d.people} persone il ${d.date} alle ${d.time}. Stato: ${result.status === "CONFIRMED" ? "confermata" : "in attesa di conferma"}.` });
  await notify({ channel: "internal", to: "staff", body: `Nuova prenotazione ${result.code} – ${d.people} pax ${d.date} ${d.time}` });
  return NextResponse.json({ code: result.code, status: result.status }, { status: 201 });
});
