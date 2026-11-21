import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "../src/lib/db";
vi.mock("../src/lib/settings", () => ({ getSettings: async () => ({
  cooking: ["Media"], ordering: { portionWeightsGrams: [500, 600, 700, 800], coverCents: 200,
    deliveryMinCents: 0, deliveryFeeCents: 300 },
}) }));
import { cartSchema, createOrder } from "../src/lib/orders";

// Explicit opt-in: uses only the project's development database.
// No email/Stripe calls. Every row is owned by this run and removed afterwards.
describe.skipIf(process.env.RUN_DB_CHECK !== "1")("ordini su PostgreSQL: pezzature e coperti", () => {
  const run = `verify_${randomUUID()}`;
  let category: { id: string }, product: { id: string }, table: { id: string; number: number };
  let serial = 0;
  const cart = (group: string = randomUUID(), overrides: Record<string, unknown> = {}) => cartSchema.parse({
    idempotencyKey: `${run}_${++serial}`, diningGroupKey: group, partySize: 3,
    coverQuoteCents: 600, expectedTotalCents: 4200,
    items: [{ productId: product.id, quantity: 1, weightGrams: 600, optionIds: [] }], ...overrides,
  });
  beforeAll(async () => {
    category = await db.category.create({ data: { name: "Verifica temporanea", slug: run } });
    product = await db.product.create({ data: { name: "Verifica temporanea 60 €/kg", slug: run, categoryId: category.id,
      priceMode: "PER_KG", priceCents: 6000, estWeightGrams: 900, channels: ["TABLE", "TAKEAWAY", "DELIVERY"] } });
    for (let number = 999; number >= 901; number--) {
      if (!await db.table.findUnique({ where: { number } })) {
        table = await db.table.create({ data: { number, seats: 6, label: run } }); break;
      }
    }
    if (!table) throw new Error("Nessun tavolo temporaneo disponibile");
  });
  afterAll(async () => {
    await db.order.deleteMany({ where: { idempotencyKey: { startsWith: run } } });
    if (table) await db.tableSession.deleteMany({ where: { tableId: table.id } });
    if (product) await db.product.delete({ where: { id: product.id } });
    if (category) await db.category.delete({ where: { id: category.id } });
    if (table) await db.table.delete({ where: { id: table.id } });
    await db.$disconnect();
  });
  it("rende definitivi 600 g a 36 € più tre coperti da 2 €, conservando la pezzatura", async () => {
    const input = cart();
    const order = await createOrder(input, { channel: "TABLE", tableNumber: table.number });
    expect(order.finalCents).toBe(4200); expect(order.coverCount).toBe(3);
    expect(order.pricingPolicy).toBe("FIXED_PORTIONS");
    const items = await db.orderItem.findMany({ where: { orderId: order.id } });
    expect(items[0]).toMatchObject({ estWeightGrams: 600, actualWeightGrams: null, lineFinalCents: 3600 });
    expect((await createOrder(input, { channel: "TABLE", tableNumber: table.number })).id).toBe(order.id);
    const extra = await createOrder(cart(input.diningGroupKey, { coverQuoteCents: 0, expectedTotalCents: 3600 }), { channel: "TABLE", tableNumber: table.number });
    expect(extra.coverCount).toBe(0); expect(extra.finalCents).toBe(3600);
  });
  it("serializza due primi ordini simultanei e non duplica i coperti", async () => {
    const group = randomUUID(), a = cart(group), b = cart(group);
    const outcomes = await Promise.allSettled([a, b].map(input => createOrder(input, { channel: "TABLE", tableNumber: table.number })));
    expect(outcomes.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(outcomes.filter(r => r.status === "rejected")).toHaveLength(1);
    const sum = await db.order.aggregate({ where: { diningGroupKey: group }, _sum: { coverCount: true } });
    expect(sum._sum.coverCount).toBe(3);
    const retry = outcomes[0].status === "rejected" ? a : b;
    const recovered = await createOrder({ ...retry, coverQuoteCents: 0, expectedTotalCents: 3600 }, { channel: "TABLE", tableNumber: table.number });
    expect(recovered.coverCount).toBe(0);
  });
  it("rifiuta pesi non autorizzati e totali alterati dal browser", async () => {
    await expect(createOrder(cart(undefined, { items: [{ productId: product.id, quantity: 1, weightGrams: 601, optionIds: [] }] }),
      { channel: "TABLE", tableNumber: table.number })).rejects.toThrow("pezzatura");
    await expect(createOrder(cart(undefined, { expectedTotalCents: 1 }),
      { channel: "TABLE", tableNumber: table.number })).rejects.toThrow("totale");
  });
  it("esclude sempre i coperti dall'asporto e dalla consegna", async () => {
    for (const channel of ["TAKEAWAY", "DELIVERY"] as const) {
      const order = await createOrder(cart(undefined, { expectedTotalCents: channel === "DELIVERY" ? 3900 : 3600 }), { channel });
      expect(order.coverCount).toBe(0); expect(order.partySize).toBe(0);
      expect(order.finalCents).toBe(channel === "DELIVERY" ? 3900 : 3600);
    }
  });
  it("mantiene la politica e gli importi degli ordini precedenti", async () => {
    const old = await db.order.create({ data: { channel: "TAKEAWAY", estimatedCents: 5400, finalCents: null,
      hasWeighted: true, idempotencyKey: `${run}_legacy` } });
    expect(old.pricingPolicy).toBe("ACTUAL_WEIGHT");
    await createOrder(cart(undefined, { expectedTotalCents: 3600 }), { channel: "TAKEAWAY" });
    expect(await db.order.findUnique({ where: { id: old.id } })).toMatchObject({
      estimatedCents: 5400, finalCents: null, pricingPolicy: "ACTUAL_WEIGHT", coverCount: 0,
    });
  });
});
