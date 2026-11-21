import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ reservation: vi.fn(), notify: vi.fn() }));
vi.mock("../src/lib/db", () => ({ db: { reservation: { findUniqueOrThrow: mocks.reservation } } }));
vi.mock("../src/lib/notify", () => ({ notify: mocks.notify }));
import { sendReservationEmail } from "../src/lib/reservation-email";
const reservation = {
  id: "reservation_fixture", code: "RES-FIXTURE", customerId: "customer_fixture",
  startsAt: new Date("2026-11-21T19:00:00Z"), people: 4, status: "PENDING",
  notes: "Nota riservata del personale", source: "web", table: { number: 7 },
  customer: { name: "Cliente fixture", email: "customer@example.invalid", phone: "0000000000" },
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.reservation.mockResolvedValue(reservation);
  mocks.notify.mockImplementation(async n => ({ ...n, status: "sent" }));
});
describe("notifiche prenotazioni", () => {
  it("invia ricevuta cliente e copia completa al locale con chiavi stabili e ora italiana", async () => {
    expect((await sendReservationEmail(reservation.id))?.status).toBe("sent");
    expect(mocks.notify).toHaveBeenCalledTimes(2);
    expect(mocks.notify).toHaveBeenCalledWith(expect.objectContaining({
      to: "customer@example.invalid", key: "reservation:reservation_fixture:RECEIVED",
    }));
    const staff = mocks.notify.mock.calls.find(([n]) => n.to === "vecciarimatera@gmail.com")![0];
    expect(staff.key).toBe("restaurant:reservation:reservation_fixture:RECEIVED");
    for (const text of ["20:00", "ora italiana", "RES-FIXTURE", "Persone: 4", "0000000000", "Nota riservata", "Tavolo: 7"])
      expect(staff.body).toContain(text);
    const customer = mocks.notify.mock.calls.find(([n]) => n.to === "customer@example.invalid")![0];
    expect(customer.body).not.toContain("Nota riservata");
  });
  it("avvisa il locale per prenotazioni telefoniche o walk-in senza email cliente", async () => {
    mocks.reservation.mockResolvedValue({ ...reservation, source: "phone", customer: { ...reservation.customer, email: null } });
    expect(await sendReservationEmail(reservation.id)).toBeNull();
    expect(mocks.notify).toHaveBeenCalledTimes(1);
    expect(mocks.notify.mock.calls[0][0]).toMatchObject({ to: "vecciarimatera@gmail.com" });
    expect(mocks.notify.mock.calls[0][0].body).toContain("Telefonica");
  });
  it.each(["CONFIRMED", "CANCELLED", "SEATED", "NO_SHOW", "COMPLETED", "WAITLIST"])(
    "avvisa il locale per stato %s e identifica la specifica modifica", async status => {
      mocks.reservation.mockResolvedValue({ ...reservation, status });
      await sendReservationEmail(reservation.id, "UPDATED", "audit_fixture", ["CONFIRMED", "CANCELLED"].includes(status));
      expect(mocks.notify).toHaveBeenCalledWith(expect.objectContaining({
        to: "vecciarimatera@gmail.com", key: "restaurant:reservation:reservation_fixture:UPDATED:audit_fixture",
      }));
      expect(mocks.notify).toHaveBeenCalledTimes(["CONFIRMED", "CANCELLED"].includes(status) ? 2 : 1);
    });
});
