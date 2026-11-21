import { db } from "./db";
import { visibleCategoryIds } from "./category-tree";
import { getSettings } from "./settings";
export type MenuData = Awaited<ReturnType<typeof loadMenu>>;
/** Menu pubblico: sempre letto dal DB, quindi ogni modifica admin è immediatamente visibile. */
export async function loadMenu(channel?: "TABLE" | "TAKEAWAY" | "DELIVERY" | "ONLINE") {
  const settings = await getSettings();
  const allCategories = await db.category.findMany({ orderBy: [{ position: "asc" }, { name: "asc" }] });
  const ids = visibleCategoryIds(allCategories);
  const [categories, products, promos] = await Promise.all([
    Promise.resolve(allCategories.filter(c => ids.includes(c.id))),
    db.product.findMany({
      where: { active: true, categoryId: { in: ids }, ...(channel === "ONLINE" ? { channels: { hasSome: ["TAKEAWAY", "DELIVERY"] } } : channel ? { channels: { has: channel } } : {}) }, orderBy: [{ position: "asc" }, { name: "asc" }],
      include: { allergens: { include: { allergen: true } }, optionGroups: { orderBy: { position: "asc" }, include: { options: true } }, breed: { select: { name: true, slug: true } }, cut: { select: { name: true, slug: true } } },
    }),
    db.promotion.findMany({ where: { active: true, startsAt: { lte: new Date() }, endsAt: { gte: new Date() } } }),
  ]);
  return {
    portionWeightsGrams: settings.ordering.portionWeightsGrams,
    coverCents: settings.ordering.coverCents,
    categories: categories.map(c => ({ id: c.id, name: c.name, parentId: c.parentId, description: c.description, image: c.images[0] ?? null })),
    products: products.map(p => ({
      id: p.id, name: p.name, description: p.description, ingredients: p.ingredients, categoryId: p.categoryId, priceMode: p.priceMode,
      priceCents: channel && channel !== "TABLE" && p.takeawayPriceCents != null ? p.takeawayPriceCents : p.priceCents,
      basePriceCents: p.priceCents, takeawayPriceCents: p.takeawayPriceCents,
      estWeightGrams: p.estWeightGrams, hasCooking: p.hasCooking, image: p.images[0] ?? null, images: p.images, available: p.available, channels: p.channels,
      dailySpecial: p.dailySpecial, offMenu: p.offMenu, seasonal: p.seasonal, origin: p.origin, pairing: p.pairing, isDemo: p.isDemo,
      specialty: p.specialty, recommended: p.recommended,
      pricePending: p.pricePending, cutName: p.cutName, breedName: p.breedName, farming: p.farming, ageing: p.ageing,
      cookingNotes: p.cookingNotes, meatCharacteristics: p.meatCharacteristics,
      breed: p.breed, cut: p.cut,
      allergens: p.allergens.map(a => ({ code: a.allergen.code, name: a.allergen.name, traces: a.traces })),
      groups: p.optionGroups.map(g => ({ id: g.id, name: g.name, min: g.minSelect, max: g.maxSelect, options: g.options.filter(o => o.available).map(o => ({ id: o.id, name: o.name, priceCents: o.priceCents })) })),
    })),
    promos: promos.map(p => ({ id: p.id, title: p.title, description: p.description, kind: p.kind })),
  };
}
