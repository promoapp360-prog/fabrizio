import type { Prisma } from "@prisma/client";
import { HttpError } from "./api";
import { wouldCycle } from "./category-tree";
import type { ResourceName } from "./resources";

/** Validate hierarchy inside the same transaction as the write. */
export async function checkMenuWrite(tx: Prisma.TransactionClient, resource: ResourceName, data: Record<string, unknown>, id?: string) {
  if (resource === "categories" && data.parentId != null) {
    const cats = await tx.category.findMany();
    if (!cats.some(c => c.id === data.parentId)) throw new HttpError(400, "Categoria padre non trovata");
    if (wouldCycle(cats, id ?? "", String(data.parentId))) throw new HttpError(400, "Una categoria non può contenere se stessa o un proprio discendente");
  }
  if (resource === "products" && data.categoryId) {
    if (!(await tx.category.findUnique({ where: { id: String(data.categoryId) } }))) throw new HttpError(400, "Categoria non trovata");
  }
}
