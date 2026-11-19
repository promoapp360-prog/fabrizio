import { describe, it, expect } from "vitest";
import { checkCapacity, findShift, slotsForDay, assignTables } from "../src/lib/availability";
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
