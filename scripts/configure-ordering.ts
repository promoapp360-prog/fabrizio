import { PrismaClient, Prisma } from "@prisma/client";
const db = new PrismaClient();
// One-time, explicit setup. Existing non-pending prices are never overwritten.
const prices: Record<string, { mode: string; cents: number }> = {
  "Costata alla brace": { mode: "PER_HG", cents: 600 },
  "Filetto": { mode: "FIXED", cents: 2800 },
  "Picanha": { mode: "PER_KG", cents: 5500 },
  "Tagliere di salumi": { mode: "FIXED", cents: 1400 },
  "Patate al forno": { mode: "FIXED", cents: 500 },
  "Tiramisù": { mode: "FIXED", cents: 600 },
  "Vino rosso della casa (calice)": { mode: "FIXED", cents: 600 },
  "Acqua minerale": { mode: "FIXED", cents: 250 },
};
async function main() { try {
  await db.$transaction(async tx => {
    for (const product of await tx.product.findMany({ where: { pricePending: true } })) {
      const price = prices[product.name];
      if (price && product.priceMode === price.mode) await tx.product.update({
        where: { id: product.id }, data: { priceCents: price.cents, pricePending: false },
      });
    }
    const ordering = await tx.setting.findUnique({ where: { key: "ordering" } });
    const current = (ordering?.value ?? {}) as Prisma.JsonObject;
    const value = { ...current, tableEnabled: true, takeawayEnabled: true, payAtTable: false, payAtCounter: true, stripeEnabled: false };
    await tx.setting.upsert({ where: { key: "ordering" }, create: { key: "ordering", value }, update: { value } });
  });
  console.log("Prezzi medi iniziali configurati; tavolo e asporto attivati; Stripe disattivato.");
} finally { await db.$disconnect(); } }
main().catch(() => { console.error("Configurazione ordini non completata."); process.exitCode = 1; });
