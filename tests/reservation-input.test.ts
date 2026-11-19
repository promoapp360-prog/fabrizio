import { describe, expect, it } from "vitest";
import { reservationDaySchema, reservationInputSchema, todayInRome } from "../src/lib/reservation-input";

const input = { date: "2030-01-10", time: "19:30", people: 2, name: "Cliente Verifica", email: "CLIENTE@EXAMPLE.INVALID ", phone: "0000000000", privacy: true, idempotencyKey: "reservation-verification" };
describe("dati della prenotazione guidata", () => {
  it("normalizza i dati dell’anagrafica", () => {
    const result = reservationInputSchema.parse(input);
    expect(result.email).toBe("cliente@example.invalid");
    expect(result.marketing).toBe(false);
  });
  it.each(["", "non-valida"])("richiede un’email valida: %s", email => {
    expect(reservationInputSchema.safeParse({ ...input, email }).success).toBe(false);
  });
  it("richiede il consenso privacy senza rendere obbligatorio il marketing", () => {
    expect(reservationInputSchema.safeParse({ ...input, privacy: false }).success).toBe(false);
    expect(reservationInputSchema.safeParse({ ...input, marketing: false }).success).toBe(true);
  });
  it.each(["2026-02-31", "2026-13-01", "non-data"])("rifiuta una data impossibile: %s", date => {
    expect(reservationDaySchema.safeParse(date).success).toBe(false);
  });
  it.each(["25:00", "19:99", "7:00"])("rifiuta un’ora non valida: %s", time => {
    expect(reservationInputSchema.safeParse({ ...input, time }).success).toBe(false);
  });
  it("calcola oggi secondo l’ora italiana anche vicino alla mezzanotte UTC", () => {
    expect(todayInRome(new Date("2026-11-19T23:30:00Z"))).toBe("2026-11-20");
    expect(todayInRome(new Date("2026-07-01T22:30:00Z"))).toBe("2026-07-02");
  });
});
