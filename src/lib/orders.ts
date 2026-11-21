import { z } from "zod";
import { db } from "./db";
import { HttpError } from "./api";
import { lineCents, isWeighted, type PriceMode } from "./pricing";
import { getSettings } from "./settings";
import { visibleCategoryIds } from "./category-tree";
import { coverCharge, FIXED_PORTIONS } from "./portions";

export const cartSchema = z.object({
  idempotencyKey: z.string().min(8).max(64),
  notes: z.string().max(500).optional(),
  diningGroupKey: z.string().uuid().optional(),
  partySize: z.number().int().min(1).max(50).optional(),
  coverQuoteCents: z.number().int().min(0).max(5_000_000).optional(),
  expectedTotalCents: z.number().int().min(0).max(99_999_999).optional(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().min(1).max(20),
    cooking: z.string().max(40).optional(),
    optionIds: z.array(z.string()).max(20).default([]),
    notes: z.string().max(200).optional(),
    weightGrams: z.number().int().min(1).max(5000).optional(),
  })).min(1).max(50),
});
export type Cart = z.infer<typeof cartSchema>;

/**
 * Crea un ordine ricalcolando TUTTI i prezzi dal database (il client non decide i prezzi).
 * Idempotente: stesso idempotencyKey → restituisce l'ordine già creato.
 */
export async function createOrder(cart: Cart, ctx: { channel: "TABLE" | "TAKEAWAY" | "DELIVERY"; sessionId?: string; tableNumber?: number; customerId?: string; customerName?: string; pickupAt?: Date; deliveryAddress?: string; paymentMethod?: "AT_TABLE" | "AT_COUNTER" | "STRIPE" | "ON_PICKUP" }) {
  const existing = await db.order.findUnique({ where: { idempotencyKey: cart.idempotencyKey } });
  if (existing) {
    if (existing.channel !== ctx.channel || existing.customerId !== (ctx.customerId ?? null) ||
      existing.tableNumber !== (ctx.tableNumber ?? null) || ctx.sessionId && existing.sessionId !== ctx.sessionId ||
      existing.diningGroupKey && existing.diningGroupKey !== cart.diningGroupKey)
      throw new HttpError(409, "Identificativo ordine già utilizzato. Ricarica la pagina.");
    return existing;
  }
  const settings = await getSettings();

  const products = await db.product.findMany({
    where: { id: { in: cart.items.map(i => i.productId) } },
    include: { optionGroups: { include: { options: true } } },
  });
  const byId = new Map(products.map(p => [p.id, p]));
  const categoryIds = new Set(visibleCategoryIds(await db.category.findMany()));
  let hasWeighted = false; let total = 0;

  const items = cart.items.map(i => {
    const p = byId.get(i.productId);
    if (!p || !p.active || !p.available || p.pricePending || !categoryIds.has(p.categoryId) || !p.channels.includes(ctx.channel)) throw new HttpError(409, `"${p?.name ?? "Prodotto"}" non è disponibile per l'ordine`);
    const allOpts = p.optionGroups.flatMap(g => g.options.map(o => ({ ...o, group: g })));
    const chosen = i.optionIds.map(id => { const o = allOpts.find(x => x.id === id); if (!o || !o.available) throw new HttpError(409, "Opzione non disponibile"); return o; });
    for (const g of p.optionGroups) {
      const n = chosen.filter(o => o.groupId === g.id).length;
      if (n < g.minSelect || n > g.maxSelect) throw new HttpError(400, `Scelta non valida per "${g.name}" (${p.name})`);
    }
    if (i.cooking && (!p.hasCooking || !settings.cooking.includes(i.cooking))) throw new HttpError(400, "Cottura non valida");
    if (p.hasCooking && !i.cooking) throw new HttpError(400, `Indica la cottura per "${p.name}"`);
    const unit = ctx.channel !== "TABLE" && p.takeawayPriceCents != null ? p.takeawayPriceCents : p.priceCents;
    const optionsCents = chosen.reduce((s, o) => s + o.priceCents, 0);
    const weighted = isWeighted(p.priceMode as PriceMode);
    if (weighted && (!i.weightGrams || !settings.ordering.portionWeightsGrams.includes(i.weightGrams)))
      throw new HttpError(400, `Scegli una pezzatura disponibile per "${p.name}"`);
    if (!weighted && i.weightGrams !== undefined) throw new HttpError(400, "Pezzatura non prevista per questo prodotto");
    hasWeighted ||= weighted;
    const est = lineCents({ priceMode: p.priceMode as PriceMode, unitCents: unit, optionsCents, quantity: i.quantity, weightGrams: i.weightGrams });
    total += est;
    return { productId: p.id, nameSnapshot: p.name, quantity: i.quantity, priceMode: p.priceMode, unitCents: unit, optionsCents,
      estWeightGrams: weighted ? i.weightGrams : null, cooking: i.cooking, notes: i.notes,
      weightConfirmed: weighted, lineFinalCents: est,
      options: chosen.map(o => ({ id: o.id, name: o.name, group: o.group.name, priceCents: o.priceCents })), lineEstCents: est };
  });

  if (ctx.channel === "DELIVERY" && total < settings.ordering.deliveryMinCents) throw new HttpError(400, "Importo minimo per la consegna non raggiunto");
  if (ctx.channel === "DELIVERY") total += settings.ordering.deliveryFeeCents;

  try {
    return await db.$transaction(async tx => {
      let sessionId = ctx.sessionId;
      let covers = { count: 0, cents: 0 };
      if (ctx.channel === "TABLE") {
        if (!ctx.tableNumber || !cart.diningGroupKey || !cart.partySize || cart.coverQuoteCents == null)
          throw new HttpError(400, "Indica per quante persone stai ordinando e conferma i coperti.");
        // All QR and online table orders share this lock, including simultaneous retries.
        const tables = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Table" WHERE number = ${ctx.tableNumber} AND active = true FOR UPDATE`;
        if (!tables.length) throw new HttpError(400, "Tavolo non disponibile");
        let session = await tx.tableSession.findFirst({ where: { tableId: tables[0].id, closedAt: null }, orderBy: { openedAt: "desc" } });
        session ??= await tx.tableSession.create({ data: { tableId: tables[0].id } });
        sessionId = session.id;
        const retry = await tx.order.findUnique({ where: { idempotencyKey: cart.idempotencyKey } });
        if (retry) {
          if (retry.customerId !== (ctx.customerId ?? null) || retry.channel !== ctx.channel ||
            retry.tableNumber !== ctx.tableNumber || retry.diningGroupKey !== cart.diningGroupKey)
            throw new HttpError(409, "Identificativo ordine già utilizzato.");
          return retry;
        }
        const previous = await tx.order.aggregate({
          where: { sessionId, diningGroupKey: cart.diningGroupKey, status: { not: "CANCELLED" } },
          _sum: { coverCount: true },
        });
        covers = coverCharge("TABLE", cart.partySize, previous._sum.coverCount ?? 0, settings.ordering.coverCents);
        if (cart.coverQuoteCents !== covers.cents)
          throw new HttpError(409, "I coperti sono stati aggiornati. Controlla il riepilogo e riprova.");
      }
      const finalTotal = total + covers.cents;
      if (!Number.isSafeInteger(finalTotal) || finalTotal < 0 || finalTotal > 99_999_999)
        throw new HttpError(400, "Totale ordine non valido");
      if (cart.expectedTotalCents != null && cart.expectedTotalCents !== finalTotal)
        throw new HttpError(409, "Il totale è cambiato. Controlla prezzi e coperti prima di confermare.");
      return tx.order.create({
      data: { channel: ctx.channel, tableNumber: ctx.tableNumber, customerId: ctx.customerId, customerName: ctx.customerName, notes: cart.notes,
        pickupAt: ctx.pickupAt, deliveryAddress: ctx.deliveryAddress, paymentMethod: ctx.paymentMethod,
        sessionId, pricingPolicy: FIXED_PORTIONS, diningGroupKey: ctx.channel === "TABLE" ? cart.diningGroupKey : null,
        partySize: ctx.channel === "TABLE" ? cart.partySize : 0, coverCount: covers.count, coverUnitCents: settings.ordering.coverCents,
        estimatedCents: finalTotal, finalCents: finalTotal, hasWeighted, idempotencyKey: cart.idempotencyKey,
        items: { create: items }, events: { create: { status: "RECEIVED" } } },
      });
    });
  } catch (e: unknown) {
    // Doppio click simultaneo: il vincolo unique su idempotencyKey vince, restituiamo l'ordine esistente.
    const dup = await db.order.findUnique({ where: { idempotencyKey: cart.idempotencyKey } });
    if (dup && dup.customerId === (ctx.customerId ?? null) && dup.channel === ctx.channel &&
      dup.tableNumber === (ctx.tableNumber ?? null) && (!ctx.sessionId || dup.sessionId === ctx.sessionId) &&
      (!dup.diningGroupKey || dup.diningGroupKey === cart.diningGroupKey)) return dup;
    throw e;
  }
}

export const STATUS_FLOW: Record<string, string[]> = {
  RECEIVED: ["CONFIRMED", "CANCELLED"], CONFIRMED: ["PREPARING", "CANCELLED"], PREPARING: ["READY", "CANCELLED"],
  READY: ["SERVED"], SERVED: [], CANCELLED: [],
};
export const STATUS_LABEL: Record<string, string> = { RECEIVED: "Ricevuto", CONFIRMED: "Confermato", PREPARING: "In preparazione", READY: "Pronto", SERVED: "Servito", CANCELLED: "Annullato" };
