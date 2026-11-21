import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  orderMail: vi.fn(), reservationMail: vi.fn(), restaurant: vi.fn(), audit: vi.fn(), permission: vi.fn(),
  db: {
    $transaction: vi.fn(), $queryRaw: vi.fn(),
    customer: { create: vi.fn() }, reservation: { create: vi.fn(), update: vi.fn() },
    order: { findUnique: vi.fn(), update: vi.fn(), count: vi.fn() }, orderEvent: { create: vi.fn() },
    orderItem: { update: vi.fn(), updateMany: vi.fn() }, payment: { create: vi.fn() },
    tableSession: { findMany: vi.fn(), updateMany: vi.fn() },
  },
}));
vi.mock("../src/lib/db", () => ({ db: m.db }));
vi.mock("../src/lib/api", () => ({
  handle: (fn: unknown) => fn,
  HttpError: class extends Error { constructor(public status: number, message: string) { super(message); } },
}));
vi.mock("../src/lib/auth", () => ({ requirePermission: m.permission }));
vi.mock("../src/lib/audit", () => ({ audit: m.audit }));
vi.mock("../src/lib/rbac", () => ({ can: () => true }));
vi.mock("../src/lib/orders", () => ({ STATUS_FLOW: { CONFIRMED: ["PREPARING", "READY", "CANCELLED"] } }));
vi.mock("../src/lib/pricing", () => ({ lineCents: () => 4200, isWeighted: () => true }));
vi.mock("../src/lib/stripe-payments", () => ({ cancelCheckout: vi.fn() }));
vi.mock("../src/lib/order-email", () => ({ sendOrderEmail: m.orderMail }));
vi.mock("../src/lib/reservation-email", () => ({ sendReservationEmail: m.reservationMail }));
vi.mock("../src/lib/commercial-email", () => ({ notifyRestaurant: m.restaurant }));

import { POST as manualReservation } from "../src/app/api/admin/reservations/route";
import { PATCH as updateReservation } from "../src/app/api/admin/reservations/[id]/route";
import { PATCH as updateOrder } from "../src/app/api/admin/orders/[id]/route";
import { POST as closeTable } from "../src/app/api/admin/tables/[id]/close/route";

const request = (body: object, method = "PATCH") => new Request("https://restaurant.example/api/admin/fixture", {
  method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});
const params = { params: Promise.resolve({ id: "fixture" }) };
beforeEach(() => {
  vi.resetAllMocks();
  m.permission.mockResolvedValue({ id: "staff_fixture", role: "SUPER_ADMIN" });
  m.audit.mockResolvedValue({ id: "audit_fixture" });
  m.db.$transaction.mockImplementation(async fn => fn(m.db));
  m.db.customer.create.mockResolvedValue({ id: "customer_fixture" });
  m.db.reservation.create.mockResolvedValue({ id: "fixture" });
  m.db.reservation.update.mockResolvedValue({ id: "fixture" });
  m.db.order.findUnique.mockResolvedValue({ tableNumber: null });
  m.db.order.update.mockResolvedValue({
    id: "fixture", status: "CONFIRMED", pricingPolicy: "ACTUAL_WEIGHT", coverCount: 0,
    finalCents: 4200, estimatedCents: 4200, payments: [], channel: "TAKEAWAY",
    items: [{ id: "item_fixture", priceMode: "PER_KG", unitCents: 7000, optionsCents: 0,
      quantity: 1, actualWeightGrams: 600, lineFinalCents: 4200, lineEstCents: 4200 }],
  });
  m.db.payment.create.mockResolvedValue({ id: "payment_fixture", status: "PAID" });
  m.db.tableSession.findMany.mockResolvedValue([{ id: "session_fixture", table: { number: 7 } }]);
  m.orderMail.mockResolvedValue({ status: "sent" });
});

describe("collegamenti degli avvisi alle operazioni commerciali del personale", () => {
  it("prenotazione telefonica senza email cliente: chiama comunque l’avviso", async () => {
    const response = await manualReservation(request({
      name: "Cliente fixture", phone: "0000000000", startsAt: "2026-11-22T19:00:00Z", people: 3,
    }, "POST"));
    expect(response.status).toBe(201);
    expect(m.reservationMail).toHaveBeenCalledWith("fixture");
  });
  it.each(["CONFIRMED", "CANCELLED", "SEATED", "NO_SHOW", "COMPLETED", "WAITLIST"] as const)(
    "prenotazione %s: notifica il locale e limita gli aggiornamenti destinati al cliente", async status => {
      await updateReservation(request({ status }), params);
      expect(m.reservationMail).toHaveBeenCalledWith("fixture", "UPDATED", "audit_fixture", status === "CONFIRMED" || status === "CANCELLED");
    });
  it("le note e l’assegnazione tavolo non diventano comunicazioni cliente", async () => {
    await updateReservation(request({ notes: "Nota interna fixture", tableId: "table_fixture" }), params);
    expect(m.reservationMail).toHaveBeenCalledWith("fixture", "UPDATED", "audit_fixture", false);
  });
  it.each(["PREPARING", "READY", "CANCELLED"] as const)("stato ordine %s: chiama l’avviso", async status => {
    await updateOrder(request({ action: "status", status }), params);
    expect(m.orderMail).toHaveBeenCalledWith("fixture", status);
  });
  it("aggiornamento peso: invia solo al locale con riferimento univoco alla modifica", async () => {
    await updateOrder(request({ action: "weight", itemId: "item_fixture", grams: 600 }), params);
    expect(m.orderMail).toHaveBeenCalledWith("fixture", "WEIGHT_UPDATED", { staffOnly: true, revision: "audit_fixture" });
  });
  it("conferma dell’importo definitivo: chiama l’avviso", async () => {
    await updateOrder(request({ action: "confirmFinal" }), params);
    expect(m.orderMail).toHaveBeenCalledWith("fixture", "FINAL");
  });
  it("incasso alla cassa: chiama l’avviso di pagamento solo dopo la registrazione", async () => {
    await updateOrder(request({ action: "payment", method: "AT_COUNTER", amountCents: 4200 }), params);
    expect(m.db.payment.create).toHaveBeenCalledOnce();
    expect(m.orderMail).toHaveBeenCalledWith("fixture", "PAID");
  });
  it("nessun avviso se l’operazione non viene salvata", async () => {
    m.db.$transaction.mockRejectedValue(new Error("rollback fixture"));
    await expect(updateOrder(request({ action: "status", status: "READY" }), params)).rejects.toThrow("rollback");
    expect(m.orderMail).not.toHaveBeenCalled();
  });
  it("chiusura della visita: avviso al locale una volta per sessione", async () => {
    await closeTable(request({}, "POST"), params);
    expect(m.restaurant).toHaveBeenCalledWith(expect.objectContaining({
      key: "table-session:session_fixture:CLOSED", subject: expect.stringContaining("Tavolo 7"),
    }));
    m.db.tableSession.findMany.mockResolvedValue([]);
    await closeTable(request({}, "POST"), params);
    expect(m.restaurant).toHaveBeenCalledTimes(1);
  });
});
