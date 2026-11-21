import { describe, it, expect } from "vitest";
import { pickupTimes, validPickupTime, romeDay } from "../src/lib/pickup-times";
describe("ritiro in ora italiana", () => {
  const now = new Date("2026-11-21T10:00:00Z");
  it("offre solo orari di servizio in intervalli di 15 minuti", () => {
    const slots = pickupTimes("2026-11-21", 30, now);
    expect(slots[0]).toEqual({ time: "12:00", at: "2026-11-21T11:00:00.000Z" });
    expect(slots.at(-1)?.time).toBe("23:00");
    expect(slots.some(s => s.time === "17:00")).toBe(false);
  });
  it("esclude lunedì, date impossibili, passate e oltre sette giorni", () => {
    for (const day of ["2026-11-23", "2026-02-30", "2026-11-20", "2026-11-29", "invalid"]) expect(pickupTimes(day, 30, now)).toEqual([]);
  });
  it("rispetta il preavviso anche quando si trascorre tempo sul modulo", () => {
    const at = new Date("2026-11-21T11:00:00Z");
    expect(validPickupTime(at, 30, now)).toBe(true);
    expect(validPickupTime(at, 30, new Date("2026-11-21T10:31:00Z"))).toBe(false);
  });
  it("dopo pranzo propone la cena e dopo chiusura nessun orario oggi", () => {
    expect(pickupTimes("2026-11-21", 30, new Date("2026-11-21T14:00:00Z"))[0].time).toBe("19:00");
    expect(pickupTimes("2026-11-21", 30, new Date("2026-11-21T21:45:00Z"))).toEqual([]);
  });
  it("converte correttamente anche l’ora legale senza usare il fuso del server", () => {
    expect(pickupTimes("2027-03-28", 30, new Date("2027-03-28T07:00:00Z"))[0].at).toBe("2027-03-28T10:00:00.000Z");
    expect(romeDay(new Date("2026-11-21T23:30:00Z"))).toBe("2026-11-22");
  });
  it("rifiuta orari falsificati, pausa, secondi arbitrari e valori non validi", () => {
    for (const at of ["2026-11-21T16:00:00Z", "2026-11-21T11:03:00Z", "2026-11-21T11:00:01Z", "invalid"])
      expect(validPickupTime(new Date(at), 30, now)).toBe(false);
  });
});
