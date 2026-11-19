import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { handle } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const GET = handle(async () => {
  await requirePermission("stock");
  return NextResponse.json(await db.stockItem.findMany({ include: { product: { select: { name: true, available: true } }, moves: { orderBy: { createdAt: "desc" }, take: 10 } }, orderBy: { name: "asc" } }));
});
// POST {itemId?, name, unit, productId?, minLevel} crea articolo; POST {itemId, type, delta, reason} registra movimento.
export const POST = handle(async (req: Request) => {
  const u = await requirePermission("stock"); const b = await req.json();
  if (b.type) {
    const d = z.object({ itemId: z.string(), type: z.enum(["LOAD", "ADJUSTMENT", "WASTE", "SALE"]), delta: z.number(), reason: z.string().max(200).optional() }).parse(b);
    const delta = new Prisma.Decimal(d.type === "WASTE" || d.type === "SALE" ? -Math.abs(d.delta) : d.delta);
    const item = await db.$transaction(async tx => {
      await tx.stockMove.create({ data: { itemId: d.itemId, type: d.type, delta, reason: d.reason, userId: u.id } });
      const it = await tx.stockItem.update({ where: { id: d.itemId }, data: { quantity: { increment: delta } } });
      // Esaurito → prodotto collegato non disponibile nel menu.
      if (it.productId) await tx.product.update({ where: { id: it.productId }, data: { available: it.quantity.gt(0) } });
      return it;
    });
    await audit(u.id, "stock_move", "StockItem", d.itemId, d);
    return NextResponse.json(item);
  }
  const d = z.object({ name: z.string().min(1), unit: z.enum(["pz", "g", "kg"]), productId: z.string().optional(), minLevel: z.number().min(0).default(0) }).parse(b);
  return NextResponse.json(await db.stockItem.create({ data: d }), { status: 201 });
});
