import { db } from "./db";
export type MenuData = Awaited<ReturnType<typeof loadMenu>>;
/** Menu pubblico: sempre letto dal DB, quindi ogni modifica admin è immediatamente visibile. */
export async function loadMenu(channel?: "TABLE" | "TAKEAWAY" | "DELIVERY") {
  const [categories, products, promos] = await Promise.all([
    db.category.findMany({ where: { active: true }, orderBy: { position: "asc" } }),
    db.product.findMany({
      where: { active: true, ...(channel ? { channels: { has: channel } } : {}) }, orderBy: { position: "asc" },
      include: { allergens: { include: { allergen: true } }, optionGroups: { orderBy: { position: "asc" }, include: { options: true } }, breed: { select: { name: true, slug: true } }, cut: { select: { name: true, slug: true } } },
    }),
    db.promotion.findMany({ where: { active: true, startsAt: { lte: new Date() }, endsAt: { gte: new Date() } } }),
  ]);
  return {
    categories: categories.map(c => ({ id: c.id, name: c.name, parentId: c.parentId })),
    products: products.map(p => ({
      id: p.id, name: p.name, description: p.description, ingredients: p.ingredients, categoryId: p.categoryId, priceMode: p.priceMode,
      priceCents: channel && channel !== "TABLE" && p.takeawayPriceCents != null ? p.takeawayPriceCents : p.priceCents,
      estWeightGrams: p.estWeightGrams, hasCooking: p.hasCooking, image: p.images[0] ?? null, available: p.available,
      dailySpecial: p.dailySpecial, offMenu: p.offMenu, seasonal: p.seasonal, origin: p.origin, pairing: p.pairing, isDemo: p.isDemo,
      breed: p.breed, cut: p.cut,
      allergens: p.allergens.map(a => ({ code: a.allergen.code, name: a.allergen.name, traces: a.traces })),
      groups: p.optionGroups.map(g => ({ id: g.id, name: g.name, min: g.minSelect, max: g.maxSelect, options: g.options.filter(o => o.available).map(o => ({ id: o.id, name: o.name, priceCents: o.priceCents })) })),
    })),
    promos: promos.map(p => ({ id: p.id, title: p.title, description: p.description, kind: p.kind })),
  };
}
