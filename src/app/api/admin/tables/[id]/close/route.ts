import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
// Chiude la sessione del tavolo: i nuovi ordini dallo stesso QR apriranno una nuova sessione (nuovi clienti).
export const POST = handle(async (_r: Request, { params }: { params: { id: string } }) => {
  const u = await requirePermission("tables");
  await db.tableSession.updateMany({ where: { tableId: params.id, closedAt: null }, data: { closedAt: new Date() } });
  await audit(u.id, "table_close", "Table", params.id);
  return NextResponse.json({ ok: true });
});
