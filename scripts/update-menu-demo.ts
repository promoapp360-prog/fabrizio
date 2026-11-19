/**
 * Explicit, idempotent development-content update. No real product is overwritten.
 * Not a deploy/start hook. Photos live in this project's Replit App Storage.
 */
import { PrismaClient, Prisma } from "@prisma/client";
const db = new PrismaClient();
const photo = (name: string) => `/api/media/assets/menu-${name}.jpg`;
const examples: Record<string, { description: string; ingredients: string; image: string }> = {
  "demo-costata": { description: "Costata con osso, rosolata sulla brace e servita al taglio. Un esempio dedicato agli amanti del gusto pieno della carne.", ingredients: "Carne bovina, olio extravergine di oliva, sale, rosmarino. Ricetta dimostrativa da confermare.", image: "brace" },
  "demo-filetto": { description: "Filetto alla brace dal carattere delicato, accompagnato da erbe aromatiche. Preparazione dimostrativa da personalizzare.", ingredients: "Filetto bovino, olio extravergine di oliva, sale, erbe aromatiche. Ricetta dimostrativa da confermare.", image: "brace" },
  "demo-picanha": { description: "Picanha alla brace, affettata al momento per valorizzare consistenza e sapore. Esempio di presentazione, non offerta ufficiale.", ingredients: "Carne bovina, sale. Ricetta dimostrativa da confermare.", image: "brace" },
  "demo-tagliere": { description: "Una selezione dimostrativa di salumi e formaggi, pensata per aprire la cena con sapori da condividere.", ingredients: "Salumi e formaggi assortiti. Composizione e allergeni da verificare con il ristoratore.", image: "antipasti" },
  "demo-patate": { description: "Spicchi di patate dorati al forno, profumati al rosmarino: un contorno semplice da abbinare alla brace.", ingredients: "Patate, olio extravergine di oliva, rosmarino, sale. Ricetta dimostrativa da confermare.", image: "contorni" },
  "demo-tiramisu": { description: "Crema al mascarpone, savoiardi al caffè e una spolverata di cacao. Un classico finale di cena, qui proposto come esempio.", ingredients: "Mascarpone, uova, savoiardi, caffè, zucchero, cacao. Ricetta dimostrativa da confermare.", image: "dolci" },
  "demo-rosso": { description: "Calice di vino rosso come esempio della selezione vini. Etichetta, annata e disponibilità saranno indicate dal ristoratore.", ingredients: "Vino rosso; contiene solfiti. Etichetta da definire.", image: "vini" },
  "demo-acqua": { description: "Acqua minerale naturale o frizzante: esempio di bevanda. Marca e formato saranno confermati dal ristoratore.", ingredients: "Acqua minerale. Marca e formato da definire.", image: "bevande" },
};
async function main() {
  let updated = 0, created = 0;
  for (const [slug, example] of Object.entries(examples)) {
    const product = await db.product.findUnique({ where: { slug } });
    if (!product?.isDemo) continue;
    await db.product.update({ where: { id: product.id }, data: {
      description: example.description, ingredients: example.ingredients, images: [photo(example.image)],
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
      name: `[DEMO] Esempio ${category.name}`, slug: `esempio-${category.slug}`, categoryId: category.id,
      description: `Prodotto dimostrativo della categoria ${category.name}. Il ristoratore definirà ricetta, ingredienti e allergeni prima della vendita.`,
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
