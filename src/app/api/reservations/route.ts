import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { handle, HttpError, rateLimit, clientIp } from "@/lib/api";
import { findShift, checkCapacity, slotsForDay, availableSlotsForDay } from "@/lib/availability";
import { reservationDaySchema, reservationInputSchema, todayInRome, type ReservationAvailability } from "@/lib/reservation-input";
import { getSettings } from "@/lib/settings";
import { resCode } from "@/lib/util";
import { notify, notificationId } from "@/lib/notify";

async function notifyReservation(message: Parameters<typeof notify>[0] & { key: string }) {
  // Prepare the deterministic record atomically before calling the transport:
  // simultaneous retries must not race on an empty-update Prisma upsert.
  const { key, ...data } = message;
  await db.notification.createMany({ data: [{ id: notificationId(key), ...data, status: "queued" }], skipDuplicates: true });
  return notify(message);
}

export const GET = handle(async (req: Request) => {
  rateLimit(`res-slots:${clientIp(req)}`, 120, 60_000);
  const query = new URL(req.url).searchParams;
  const date = reservationDaySchema.parse(query.get("date"));
  const people = z.coerce.number().int().min(1).max(40).parse(query.get("people") ?? 2);
  const day = new Date(`${date}T12:00:00`);
  const [settings, closure, shifts] = await Promise.all([
    getSettings(),
    db.closure.findFirst({ where: { date: new Date(`${date}T00:00:00Z`) } }),
    db.shift.findMany({ orderBy: { start: "asc" } }),
  ]);
  const activeShifts = shifts.filter(shift => shift.active && shift.weekdays.includes(day.getDay()));
  const closed = date < todayInRome() ? "Scegli una data da oggi in poi."
    : closure ? closure.reason || "Chiusura straordinaria"
    : !activeShifts.length ? day.getDay() === 1 ? "Lunedì chiuso" : "Nessun turno di apertura in questa data" : null;
  const result: ReservationAvailability = { date, people, open: !closed, closed, slots: [], services: [] };
  if (closed) return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  if (people > settings.reservations.maxPartyOnline) {
    result.requiresContact = true;
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  }
  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
  const [existing, tables] = await Promise.all([
    db.reservation.findMany({ where: { startsAt: { gte: dayStart, lt: dayEnd } }, select: { startsAt: true, people: true, status: true } }),
    db.table.findMany({ select: { id: true, seats: true, active: true, reservable: true } }),
  ]);
  result.slots = availableSlotsForDay({ day, shifts, existing, tables, people, ...settings.reservations });
  result.services = activeShifts.map(shift => ({
    id: shift.id, name: shift.name,
    slots: result.slots.filter(time => slotsForDay([shift], day).includes(time)),
  }));
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
});

export const POST = handle(async (req: Request) => {
  rateLimit(`res:${clientIp(req)}`, 5, 60_000);
  const d = reservationInputSchema.parse(await req.json());
  type Reservation = Prisma.ReservationGetPayload<{ include: { customer: true } }>;
  function checkOwner(reservation: Reservation) {
    if (reservation.customer.email?.toLowerCase() !== d.email) throw new HttpError(409, "Identificativo richiesta già utilizzato");
    return reservation;
  }
  const previous = await db.reservation.findUnique({ where: { idempotencyKey: d.idempotencyKey }, include: { customer: true } });
  let result: Reservation | null = previous ? checkOwner(previous) : null;
  let created = false;
  if (!result) {
    const s = await getSettings();
    const startsAt = new Date(`${d.date}T${d.time}:00`);
    if (startsAt.getTime() < Date.now() + s.reservations.minNoticeMin * 60000) throw new HttpError(400, "Orario troppo vicino o già passato");
    if (await db.closure.findFirst({ where: { date: new Date(`${d.date}T00:00:00Z`) } })) throw new HttpError(409, "Il ristorante è chiuso in questa data");
    const shifts = await db.shift.findMany();
    const shift = findShift(shifts, startsAt);
    if (!shift || !slotsForDay([shift], startsAt).includes(d.time)) throw new HttpError(409, "Orario fuori dai turni di apertura");

    for (let attempt = 0; attempt < 3 && !result; attempt++) {
      try {
        result = await db.$transaction(async tx => {
          const duplicate = await tx.reservation.findUnique({ where: { idempotencyKey: d.idempotencyKey }, include: { customer: true } });
          if (duplicate) return checkOwner(duplicate);
          const dayStart = new Date(startsAt); dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
          const existing = (await tx.reservation.findMany({ where: { startsAt: { gte: dayStart, lt: dayEnd } } }))
            .filter(reservation => !!findShift([shift], reservation.startsAt));
          const tables = await tx.table.findMany();
          const capacity = checkCapacity({ shift, existing, people: d.people, tables, startsAt, ...s.reservations });
          if (!capacity.ok) throw new HttpError(409, capacity.reason);
          const customer = await tx.customer.upsert({
            where: { email: d.email }, update: { name: d.name, phone: d.phone },
            create: { name: d.name, email: d.email, phone: d.phone },
          });
          await tx.consent.createMany({ data: [
            { customerId: customer.id, kind: "privacy", granted: true, source: "prenotazione web", textVersion: "privacy-prenotazioni-1" },
            { customerId: customer.id, kind: "marketing_email", granted: d.marketing, source: "prenotazione web" },
          ] });
          const reservation = await tx.reservation.create({
            data: { code: resCode(), customerId: customer.id, startsAt, endsAt: new Date(startsAt.getTime() + s.reservations.durationMin * 60000),
              people: d.people, notes: d.notes, status: s.reservations.autoConfirm ? "CONFIRMED" : "PENDING", idempotencyKey: d.idempotencyKey },
            include: { customer: true },
          });
          return reservation;
        }, { isolationLevel: "Serializable" });
        created = true;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2002"].includes(error.code)) {
          const duplicate = await db.reservation.findUnique({ where: { idempotencyKey: d.idempotencyKey }, include: { customer: true } });
          if (duplicate) result = checkOwner(duplicate);
          else if (attempt === 2) throw new HttpError(409, "La disponibilità è cambiata. Scegli nuovamente l’orario.");
        } else throw error;
      }
    }
  }
  if (!result) throw new HttpError(409, "Disponibilità da aggiornare");
  const formatted = result.startsAt.toLocaleString("it-IT", { timeZone: "Europe/Rome", dateStyle: "long", timeStyle: "short" });
  const email = await notifyReservation({
    channel: "email", to: result.customer.email!, subject: `Vecciarì · Prenotazione ${result.code}`, customerId: result.customerId,
    key: `reservation:${result.id}:RECEIVED`,
    body: `Grazie ${result.customer.name}, abbiamo ricevuto la tua richiesta per ${result.people} persone il ${formatted}. Codice: ${result.code}. Stato: ${result.status === "CONFIRMED" ? "confermata" : "in attesa di conferma dal ristorante"}.`,
  });
  await notifyReservation({ channel: "internal", to: "staff", key: `reservation:${result.id}:STAFF`, body: `Nuova prenotazione ${result.code} – ${result.people} persone · ${formatted}` });
  return NextResponse.json({ id: result.id, code: result.code, status: result.status, emailStatus: email.status }, { status: created ? 201 : 200 });
});
