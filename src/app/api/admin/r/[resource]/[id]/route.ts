import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle, HttpError } from "@/lib/api";
import { checkMenuWrite } from "@/lib/menu-admin";
import { requirePermission } from "@/lib/auth";
import { RESOURCES } from "@/lib/resources";
import { audit } from "@/lib/audit";
import { saveRelations, splitRelations } from "@/lib/relations";
import { getRes, model } from "@/lib/resource-db";

export const GET = handle(async (_r: Request, { params: pendingParams }: { params: Promise<{ resource: string; id: string }> }) => {
  const params = await pendingParams;
  const r = getRes(params.resource); const cfg = RESOURCES[r];
  await requirePermission(cfg.perm);
  return NextResponse.json(await model(r).findUniqueOrThrow({ where: { id: params.id }, include: "include" in cfg ? cfg.include : undefined }));
});

export const PATCH = handle(async (req: Request, { params: pendingParams }: { params: Promise<{ resource: string; id: string }> }) => {
  const params = await pendingParams;
  const r = getRes(params.resource); const cfg = RESOURCES[r];
  const user = await requirePermission(cfg.perm);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parsed = (cfg.schema as any).partial().parse(await req.json()) as Record<string, unknown>;
  const { data, rel } = splitRelations(parsed);
  const row = await db.$transaction(async tx => {
    await checkMenuWrite(tx, r, data, params.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await (tx as any)[cfg.model].update({ where: { id: params.id }, data });
    await saveRelations(tx, r, params.id, rel);
    return updated;
  });
  await audit(user.id, "update", r, params.id, parsed);
  return NextResponse.json(row);
});

export const DELETE = handle(async (_r: Request, { params: pendingParams }: { params: Promise<{ resource: string; id: string }> }) => {
  const params = await pendingParams;
  const r = getRes(params.resource); const cfg = RESOURCES[r];
  const user = await requirePermission(cfg.perm);
  if (r === "media") {
    const media = await db.media.findUnique({ where: { id: params.id } });
    if (media) {
      const [products, categories, sections] = await Promise.all([
        db.product.count({ where: { images: { has: media.url } } }),
        db.category.count({ where: { images: { has: media.url } } }),
        db.section.findMany({ select: { content: true, draft: true } }),
      ]);
      if (products || categories || sections.some(s => JSON.stringify(s).includes(media.url))) {
        throw new HttpError(409, "Foto ancora utilizzata nel sito. Rimuovila prima dai piatti, dalle categorie o dai contenuti collegati.");
      }
    }
  }
  if (r === "categories") {
    await db.$transaction(async tx => {
      const [products, children] = await Promise.all([
        tx.product.count({ where: { categoryId: params.id } }),
        tx.category.count({ where: { parentId: params.id } }),
      ]);
      if (products || children) throw new HttpError(409, `La categoria contiene ${products} prodotti e ${children} sottocategorie. Spostali in un'altra categoria prima di eliminarla, oppure nascondi la categoria.`);
      await tx.category.delete({ where: { id: params.id } });
    });
    await audit(user.id, "delete", r, params.id);
    return NextResponse.json({ ok: true });
  }
  if (r === "products") {
    // Prodotti già ordinati non si cancellano (storico): si disattivano.
    const used = await db.orderItem.count({ where: { productId: params.id } });
    if (used) { await db.product.update({ where: { id: params.id }, data: { active: false } }); await audit(user.id, "deactivate", r, params.id); return NextResponse.json({ deactivated: true }); }
  }
  await model(r).delete({ where: { id: params.id } });
  await audit(user.id, "delete", r, params.id);
  return NextResponse.json({ ok: true });
});
