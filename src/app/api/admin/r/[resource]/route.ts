import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle } from "@/lib/api";
import { getRes, model } from "@/lib/resource-db";
import { requirePermission } from "@/lib/auth";
import { RESOURCES } from "@/lib/resources";
import { audit } from "@/lib/audit";
import { saveRelations, splitRelations } from "@/lib/relations";
import { checkMenuWrite } from "@/lib/menu-admin";


export const GET = handle(async (_req: Request, { params: pendingParams }: { params: Promise<{ resource: string }> }) => {
  const params = await pendingParams;
  const r = getRes(params.resource); const cfg = RESOURCES[r];
  await requirePermission(cfg.perm);
  return NextResponse.json(await model(r).findMany({ where: r === "media" ? { OR: [{ gallery: null }, { gallery: { not: "__pending" } }] } : undefined, orderBy: cfg.orderBy, include: "include" in cfg ? cfg.include : undefined }));
});

export const POST = handle(async (req: Request, { params: pendingParams }: { params: Promise<{ resource: string }> }) => {
  const params = await pendingParams;
  const r = getRes(params.resource); const cfg = RESOURCES[r];
  const user = await requirePermission(cfg.perm);
  const parsed = cfg.schema.parse(await req.json()) as Record<string, unknown>;
  const { data, rel } = splitRelations(parsed);
  const row = await db.$transaction(async tx => {
    await checkMenuWrite(tx, r, data);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const created = await (tx as any)[cfg.model].create({ data });
    await saveRelations(tx, r, created.id, rel);
    return created;
  });
  await audit(user.id, "create", r, row.id, parsed);
  return NextResponse.json(row, { status: 201 });
});
