// Logica disponibilità prenotazioni (pura, testata in tests/availability.test.ts).
export type ShiftLite = { id: string; weekdays: number[]; start: string; end: string; slotMinutes: number; maxCovers: number; active: boolean };
export type ResLite = { startsAt: Date; people: number; status: string };
export type TableLite = { id: string; seats: number; reservable: boolean; active: boolean };

const toMin = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };

/** Turno che contiene l'orario richiesto (ora locale del server, impostare TZ=Europe/Rome). */
export function findShift(shifts: ShiftLite[], at: Date) {
  const mins = at.getHours() * 60 + at.getMinutes();
  return shifts.find(s => s.active && s.weekdays.includes(at.getDay()) && mins >= toMin(s.start) && mins <= toMin(s.end) - s.slotMinutes) ?? null;
}

export function slotsForDay(shifts: ShiftLite[], day: Date) {
  const out: string[] = [];
  for (const s of shifts.filter(s => s.active && s.weekdays.includes(day.getDay()))) {
    for (let m = toMin(s.start); m <= toMin(s.end) - s.slotMinutes; m += s.slotMinutes)
      out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return out;
}

const ACTIVE = new Set(["PENDING", "CONFIRMED", "SEATED"]);

/** Assegna greedy le prenotazioni sovrapposte ai tavoli (più grandi prima, tavolo più piccolo adatto). */
export function assignTables(parties: number[], tables: TableLite[]): boolean {
  const free = tables.filter(t => t.active && t.reservable).map(t => t.seats).sort((a, b) => a - b);
  for (const p of [...parties].sort((a, b) => b - a)) {
    const idx = free.findIndex(s => s >= p);
    if (idx < 0) return false;
    free.splice(idx, 1);
  }
  return true;
}

/**
 * Verifica capienza: (1) gruppo entro limite online, (2) coperti del turno,
 * (3) tutte le prenotazioni sovrapposte + la nuova devono trovare un tavolo.
 */
export function checkCapacity(opts: { shift: ShiftLite; existing: ResLite[]; people: number; tables: TableLite[]; startsAt: Date; durationMin: number; maxPartyOnline: number }) {
  const { shift, existing, people, tables, startsAt, durationMin, maxPartyOnline } = opts;
  if (people < 1) return { ok: false as const, reason: "Numero di persone non valido" };
  if (people > maxPartyOnline) return { ok: false as const, reason: `Per gruppi oltre ${maxPartyOnline} persone contattaci telefonicamente` };
  const active = existing.filter(r => ACTIVE.has(r.status));
  if (active.reduce((s, r) => s + r.people, 0) + people > shift.maxCovers) return { ok: false as const, reason: "Turno al completo" };
  const start = startsAt.getTime(), end = start + durationMin * 60000;
  const overlapping = active.filter(r => r.startsAt.getTime() < end && r.startsAt.getTime() + durationMin * 60000 > start);
  if (!assignTables([...overlapping.map(r => r.people), people], tables))
    return { ok: false as const, reason: "Nessun tavolo adatto libero in questa fascia oraria" };
  return { ok: true as const };
}

/** Same capacity rules for the public picker and the final server-side check. */
export function availableSlotsForDay(opts: {
  day: Date; shifts: ShiftLite[]; existing: ResLite[]; tables: TableLite[];
  people: number; durationMin: number; maxPartyOnline: number; minNoticeMin: number; now?: Date;
}) {
  const earliest = (opts.now ?? new Date()).getTime() + opts.minNoticeMin * 60000;
  return [...new Set(slotsForDay(opts.shifts, opts.day))].sort().filter(time => {
    const at = new Date(opts.day);
    const [hours, minutes] = time.split(":").map(Number);
    at.setHours(hours, minutes, 0, 0);
    const shift = findShift(opts.shifts, at);
    if (!shift || at.getTime() < earliest) return false;
    return checkCapacity({
      shift, existing: opts.existing.filter(res => !!findShift([shift], res.startsAt)),
      tables: opts.tables, people: opts.people, startsAt: at,
      durationMin: opts.durationMin, maxPartyOnline: opts.maxPartyOnline,
    }).ok;
  });
}
