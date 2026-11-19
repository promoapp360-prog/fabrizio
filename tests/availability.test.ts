import { describe, it, expect } from "vitest";
import { checkCapacity, findShift, slotsForDay, assignTables, availableSlotsForDay } from "../src/lib/availability";
const shift = { id: "s", weekdays: [0, 1, 2, 3, 4, 5, 6], start: "19:30", end: "23:30", slotMinutes: 30, maxCovers: 20, active: true };
const tables = [{ id: "a", seats: 2, reservable: true, active: true }, { id: "b", seats: 4, reservable: true, active: true }, { id: "c", seats: 6, reservable: true, active: true }];
const at = (h: number, m = 0) => { const d = new Date(2030, 0, 10, h, m); return d; };
const base = { shift, tables, durationMin: 120, maxPartyOnline: 10 };

describe("prenotazioni", () => {
  it("trova il turno", () => { expect(findShift([shift], at(20))?.id).toBe("s"); expect(findShift([shift], at(13))).toBeNull(); });
  it("genera fasce orarie", () => expect(slotsForDay([shift], at(12))).toContain("23:00"));
  it("[Test 6] accetta tavolo disponibile", () => expect(checkCapacity({ ...base, existing: [], people: 4, startsAt: at(20) }).ok).toBe(true));
  it("[Test 7] rifiuta gruppo più grande del tavolo più grande", () => expect(checkCapacity({ ...base, existing: [], people: 8, startsAt: at(20) }).ok).toBe(false));
  it("[Test 7] rifiuta oltre i coperti del turno", () => expect(checkCapacity({ ...base, existing: [{ startsAt: at(19, 30), people: 18, status: "CONFIRMED" }], people: 4, startsAt: at(22) }).ok).toBe(false));
  it("[Test 7] rifiuta quando i tavoli adatti sono occupati nella fascia", () => {
    const existing = [{ startsAt: at(20), people: 5, status: "CONFIRMED" }, { startsAt: at(20), people: 4, status: "CONFIRMED" }];
    expect(checkCapacity({ ...base, existing, people: 4, startsAt: at(20, 30) }).ok).toBe(false);
    expect(checkCapacity({ ...base, existing, people: 2, startsAt: at(20, 30) }).ok).toBe(true);
  });
  it("ignora prenotazioni annullate", () => expect(checkCapacity({ ...base, existing: [{ startsAt: at(20), people: 20, status: "CANCELLED" }], people: 6, startsAt: at(20) }).ok).toBe(true));
  it("assegnazione greedy", () => { expect(assignTables([6, 4, 2], tables)).toBe(true); expect(assignTables([4, 4], tables)).toBe(true); expect(assignTables([4, 4, 4], tables)).toBe(false); });
});

describe("orari disponibili per il percorso guidato", () => {
  const query = { day: at(12), shifts: [shift], existing: [], tables, people: 2, durationMin: 120, maxPartyOnline: 10, minNoticeMin: 60, now: at(18) };
  it("mostra solo gli orari che rispettano il preavviso", () => {
    const result = availableSlotsForDay({ ...query, now: at(19) });
    expect(result).not.toContain("19:30");
    expect(result).toContain("20:00");
  });
  it("ricalcola gli orari in base alla dimensione del gruppo", () => {
    expect(availableSlotsForDay(query)).toContain("19:30");
    expect(availableSlotsForDay({ ...query, people: 8 })).toEqual([]);
    expect(availableSlotsForDay({ ...query, people: 11 })).toEqual([]);
  });
  it("nasconde gli orari occupati ma lascia quelli dopo il rilascio dei tavoli", () => {
    const existing = [2, 4, 6].map(people => ({ people, startsAt: at(19, 30), status: "CONFIRMED" }));
    const result = availableSlotsForDay({ ...query, existing });
    expect(result).not.toContain("19:30");
    expect(result).not.toContain("21:00");
    expect(result).toContain("21:30");
  });
  it("non considera occupanti le prenotazioni annullate", () => {
    const existing = [2, 4, 6].map(people => ({ people, startsAt: at(19, 30), status: "CANCELLED" }));
    expect(availableSlotsForDay({ ...query, existing })).toContain("19:30");
  });
  it("rispetta la capienza del turno e i tavoli non prenotabili", () => {
    expect(availableSlotsForDay({ ...query, existing: [{ people: 20, startsAt: at(19, 30), status: "PENDING" }] })).toEqual([]);
    expect(availableSlotsForDay({ ...query, tables: tables.map(table => ({ ...table, reservable: false })) })).toEqual([]);
  });
  it("non genera orari per un giorno di chiusura", () => {
    expect(availableSlotsForDay({ ...query, shifts: [{ ...shift, weekdays: [] }] })).toEqual([]);
  });
});
