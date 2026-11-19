import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { secureToken } from "@/lib/util";
import { audit } from "@/lib/audit";

// POST → rigenera QR tavolo (il vecchio smette di funzionare). DELETE → disattiva.
export const POST = handle(async (_r: Request, { params }: { params: { tableId: string } }) => {
  const u = await requirePermission("tables");
  const qr = await db.$transaction(async tx => {
    await tx.qrCode.updateMany({ where: { tableId: params.tableId, active: true }, data: { active: false } });
    return tx.qrCode.create({ data: { token: secureToken(), kind: "TABLE", tableId: params.tableId } });
  });
  await audit(u.id, "qr_regenerate", "Table", params.tableId);
  return NextResponse.json(qr);
});
export const DELETE = handle(async (_r: Request, { params }: { params: { tableId: string } }) => {
  const u = await requirePermission("tables");
  await db.qrCode.updateMany({ where: { tableId: params.tableId }, data: { active: false } });
  await audit(u.id, "qr_disable", "Table", params.tableId);
  return NextResponse.json({ ok: true });
});
