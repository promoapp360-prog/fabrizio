import { z } from "zod";
import { db } from "./db";
import { HttpError } from "./api";
import { lineCents, isWeighted, type PriceMode } from "./pricing";
import { getSettings } from "./settings";
import { visibleCategoryIds } from "./category-tree";

export const cartSchema = z.object({
  idempotencyKey: z.string().min(8).max(64),
  notes: z.string().max(500).optional(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().min(1).max(20),
    cooking: z.string().max(40).optional(),
    optionIds: z.array(z.string()).max(20).default([]),
    notes: z.string().max(200).optional(),
  })).min(1).max(50),
});
export type Cart = z.infer<typeof cartSchema>;

/**
 * Crea un ordine ricalcolando TUTTI i prezzi dal database (il client non decide i prezzi).
 * Idempotente: stesso idempotencyKey → restituisce l'ordine già creato.
 */
export async function createOrder(cart: Cart, ctx: { channel: "TABLE" | "TAKEAWAY" | "DELIVERY"; sessionId?: string; tableNumber?: number; customerId?: string; pickupAt?: Date; deliveryAddress?: string; paymentMethod?: "AT_TABLE" | "AT_COUNTER" | "STRIPE" | "ON_PICKUP" }) {
  const existing = await db.order.findUnique({ where: { idempotencyKey: cart.idempotencyKey } });
  if (existing) return existing;
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
    hasWeighted ||= weighted;
    const est = lineCents({ priceMode: p.priceMode as PriceMode, unitCents: unit, optionsCents, quantity: i.quantity, weightGrams: p.estWeightGrams });
    total += est;
    return { productId: p.id, nameSnapshot: p.name, quantity: i.quantity, priceMode: p.priceMode, unitCents: unit, optionsCents,
      estWeightGrams: weighted ? p.estWeightGrams : null, cooking: i.cooking, notes: i.notes,
      options: chosen.map(o => ({ id: o.id, name: o.name, group: o.group.name, priceCents: o.priceCents })), lineEstCents: est };
  });

  if (ctx.channel === "DELIVERY" && total < settings.ordering.deliveryMinCents) throw new HttpError(400, "Importo minimo per la consegna non raggiunto");
  if (ctx.channel === "DELIVERY") total += settings.ordering.deliveryFeeCents;

  try {
    return await db.order.create({
      data: { channel: ctx.channel, sessionId: ctx.sessionId, tableNumber: ctx.tableNumber, customerId: ctx.customerId, notes: cart.notes,
        pickupAt: ctx.pickupAt, deliveryAddress: ctx.deliveryAddress, paymentMethod: ctx.paymentMethod,
        estimatedCents: total, finalCents: hasWeighted ? null : total, hasWeighted, idempotencyKey: cart.idempotencyKey,
        items: { create: items }, events: { create: { status: "RECEIVED" } } },
    });
  } catch (e: unknown) {
    // Doppio click simultaneo: il vincolo unique su idempotencyKey vince, restituiamo l'ordine esistente.
    const dup = await db.order.findUnique({ where: { idempotencyKey: cart.idempotencyKey } });
    if (dup) return dup; throw e;
  }
}

export const STATUS_FLOW: Record<string, string[]> = {
  RECEIVED: ["CONFIRMED", "CANCELLED"], CONFIRMED: ["PREPARING", "CANCELLED"], PREPARING: ["READY", "CANCELLED"],
  READY: ["SERVED"], SERVED: [], CANCELLED: [],
};
export const STATUS_LABEL: Record<string, string> = { RECEIVED: "Ricevuto", CONFIRMED: "Confermato", PREPARING: "In preparazione", READY: "Pronto", SERVED: "Servito", CANCELLED: "Annullato" };
