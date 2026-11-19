/**
 * Explicit, idempotent development-content update. No real product is overwritten.
 * Not a deploy/start hook. Photos live in this project's Replit App Storage.
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { PRODUCT_COPY, withoutDemoLabel } from "../src/lib/restaurant-content";
const db = new PrismaClient();
const photo = (name: string) => `/api/media/assets/menu-${name}.jpg`;
const photoNames: Record<string, string> = { "demo-tagliere": "antipasti", "demo-patate": "contorni", "demo-tiramisu": "dolci", "demo-rosso": "vini", "demo-acqua": "bevande" };
const examples = Object.fromEntries(Object.entries(PRODUCT_COPY).map(([slug, copy]) => [slug, { ...copy, image: photoNames[slug] ?? "brace" }]));
async function main() {
  let updated = 0, created = 0;
  for (const [slug, example] of Object.entries(examples)) {
    const product = await db.product.findUnique({ where: { slug } });
    if (!product?.isDemo) continue;
    await db.product.update({ where: { id: product.id }, data: {
      name: withoutDemoLabel(product.name), description: example.description, ingredients: example.ingredients, images: [photo(example.image)],
      pricePending: true, breedId: null, origin: null,
    } });
    updated++;
  }
  // Respect actual categories, including any added since the original seed.
  for (const category of await db.category.findMany()) {
    if (await db.product.count({ where: { categoryId: category.id, isDemo: true } })) continue;
    const product = await db.product.findUnique({ where: { slug: `esempio-${category.slug}` } });
    if (product) continue;
    await db.product.create({ data: {
      name: category.name, slug: `esempio-${category.slug}`, categoryId: category.id,
      description: `Per informazioni sulle proposte della categoria ${category.name}, chiedi al personale.`,
      ingredients: "Da definire dal ristoratore", images: [photo("brace")], priceCents: 0, pricePending: true, isDemo: true,
    } });
    created++;
  }
  const home = await db.page.findUnique({ where: { slug: "home" }, include: { sections: true } });
  const hero = home?.sections.find(s => s.type === "hero");
  if (hero) {
    const content = { ...(hero.content as Prisma.JsonObject), restaurantHome: true, title: "VECCIARÍ", subtitle: "MATERA", image: "/api/media/assets/hero-desktop.png", mobileImage: "/api/media/assets/hero-mobile.png", video: "" };
    await db.section.update({ where: { id: hero.id }, data: { content, draft: hero.draft ? { ...(hero.draft as Prisma.JsonObject), ...content } : Prisma.DbNull } });
  }
  const brand = await db.setting.findUnique({ where: { key: "brand" } });
  if (brand && /radici di grano/i.test(String((brand.value as Prisma.JsonObject).motto ?? ""))) {
    await db.setting.update({ where: { key: "brand" }, data: { value: { ...(brand.value as Prisma.JsonObject), motto: "Matera" } } });
  }
  console.log(`Menu dimostrativo: ${updated} esempi aggiornati, ${created} aggiunti. Prodotti reali preservati.`);
}
main().catch(() => { console.error("Aggiornamento contenuti non riuscito"); process.exitCode = 1; }).finally(() => db.$disconnect());
