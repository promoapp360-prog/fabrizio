import type { Prisma } from "@prisma/client";
import type { ResourceName } from "./resources";
// Relazioni molti-a-molti salvate insieme alla risorsa principale (stessa transazione).
const REL_KEYS = ["allergenIds", "traceIds", "optionGroups", "cutIds"] as const;
export function splitRelations(input: Record<string, unknown>) {
  const data = { ...input }; const rel: Record<string, unknown> = {};
  for (const k of REL_KEYS) if (k in data) { rel[k] = data[k]; delete data[k]; }
  return { data, rel };
}
type G = { name: string; minSelect: number; maxSelect: number; options: { name: string; priceCents: number; available: boolean }[] };
export async function saveRelations(tx: Prisma.TransactionClient, r: ResourceName, id: string, rel: Record<string, unknown>) {
  if (r === "products") {
    if (rel.allergenIds || rel.traceIds) {
      await tx.productAllergen.deleteMany({ where: { productId: id } });
      const a = (rel.allergenIds as string[]) ?? [], t = ((rel.traceIds as string[]) ?? []).filter(x => !a.includes(x));
      await tx.productAllergen.createMany({ data: [...a.map(allergenId => ({ productId: id, allergenId })), ...t.map(allergenId => ({ productId: id, allergenId, traces: true }))] });
    }
    if (rel.optionGroups) {
      await tx.optionGroup.deleteMany({ where: { productId: id } });
      for (const [i, g] of (rel.optionGroups as G[]).entries())
        await tx.optionGroup.create({ data: { productId: id, name: g.name, minSelect: g.minSelect, maxSelect: g.maxSelect, position: i, options: { create: g.options } } });
    }
  }
  if (r === "breeds" && rel.cutIds) {
    await tx.breedCut.deleteMany({ where: { breedId: id } });
    await tx.breedCut.createMany({ data: (rel.cutIds as string[]).map(cutId => ({ breedId: id, cutId })) });
  }
}
