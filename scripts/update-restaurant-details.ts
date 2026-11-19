/**
 * Aggiornamento esplicito dei soli contatti e testi richiesti dal cliente.
 * Non modifica prezzi, disponibilità, stato di verifica o dati degli ordini.
 * Non eseguire automaticamente all'avvio o durante la pubblicazione.
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { PRODUCT_COPY, RESTAURANT_CONTACTS, SITE_COPY, withoutDemoLabel } from "../src/lib/restaurant-content";

const db = new PrismaClient();
const sectionCopy: Record<string, object> = {
  "home:philosophy": SITE_COPY.homePhilosophy,
  "home:quality": SITE_COPY.homeQuality,
  "ristorante:Storia": SITE_COPY.restaurantStory,
  "ristorante:Ambienti": SITE_COPY.restaurantRoom,
  "ristorante:Cucina": SITE_COPY.restaurantKitchen,
};
const needsCopy = (text: unknown) => typeof text === "string" && /\[DEMO\]|dimostrativ|segnaposto|come esempio|esempio di|un esempio/i.test(text);

function cleanLabels(value: Prisma.JsonValue): Prisma.JsonValue {
  if (typeof value === "string") return withoutDemoLabel(value);
  if (Array.isArray(value)) return value.map(cleanLabels);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, cleanLabels(v ?? null)]));
  return value;
}

async function main() {
  const result = await db.$transaction(async tx => {
    const saved = await tx.setting.findUnique({ where: { key: "contacts" } });
    const current = (saved?.value ?? {}) as Prisma.JsonObject;
    const contacts: Prisma.JsonObject = { ...current, ...RESTAURANT_CONTACTS };
    if (needsCopy(contacts.hours)) contacts.hours = "";
    await tx.setting.upsert({ where: { key: "contacts" }, create: { key: "contacts", value: contacts }, update: { value: contacts } });

    let products = 0, sections = 0;
    for (const product of await tx.product.findMany({ where: { isDemo: true } })) {
      const copy = PRODUCT_COPY[product.slug];
      await tx.product.update({ where: { id: product.id }, data: {
        name: withoutDemoLabel(product.name),
        ...(copy && needsCopy(product.description) ? { description: copy.description } : {}),
        ...(copy && needsCopy(product.ingredients) ? { ingredients: copy.ingredients } : {}),
      } });
      products++;
    }
    for (const page of await tx.page.findMany({ include: { sections: true } })) {
      for (const section of page.sections) {
        const content = section.content as Prisma.JsonObject;
        const copy = sectionCopy[`${page.slug}:${section.type === "richtext" ? content.eyebrow : section.type}`];
        const published = { ...(cleanLabels(content) as Prisma.JsonObject), ...(copy && needsCopy(content.body) ? copy : {}) };
        let draft: Prisma.InputJsonValue | undefined;
        if (section.draft) {
          const previous = section.draft as Prisma.JsonObject;
          draft = { ...(cleanLabels(previous) as Prisma.JsonObject), ...(copy && needsCopy(previous.body) ? copy : {}) } as Prisma.InputJsonValue;
        }
        if (JSON.stringify(published) !== JSON.stringify(content) || (draft && JSON.stringify(draft) !== JSON.stringify(section.draft))) {
          await tx.section.update({ where: { id: section.id }, data: { content: published as Prisma.InputJsonValue, ...(draft ? { draft } : {}) } });
          sections++;
        }
      }
    }
    return { products, sections };
  });
  console.log(`Contatti aggiornati; ${result.products} nomi e testi prodotto controllati, ${result.sections} sezioni aggiornate. Prezzi e disponibilità invariati.`);
}
main().catch(() => { console.error("Aggiornamento dei contatti e testi non riuscito"); process.exitCode = 1; }).finally(() => db.$disconnect());
