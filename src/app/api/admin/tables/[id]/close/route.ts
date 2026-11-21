import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { notifyRestaurant } from "@/lib/commercial-email";
// Chiude la sessione del tavolo: i nuovi ordini dallo stesso QR apriranno una nuova sessione (nuovi clienti).
export const POST = handle(async (_r: Request, { params: pendingParams }: { params: Promise<{ id: string }> }) => {
  const params = await pendingParams;
  const u = await requirePermission("tables");
  const closed = await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Table" WHERE id = ${params.id} FOR UPDATE`;
    const sessions = await tx.tableSession.findMany({
      where: { tableId: params.id, closedAt: null }, include: { table: true },
    });
    await tx.tableSession.updateMany({ where: { tableId: params.id, closedAt: null }, data: { closedAt: new Date() } });
    return sessions;
  });
  await audit(u.id, "table_close", "Table", params.id);
  await Promise.all(closed.map(session => notifyRestaurant({
    key: `table-session:${session.id}:CLOSED`, subject: `Vecciarì · Tavolo ${session.table.number} · Visita conclusa`,
    body: `La visita al tavolo ${session.table.number} è stata chiusa dal personale. I nuovi ordini apriranno una nuova visita e un nuovo conteggio dei coperti.`,
  })));
  return NextResponse.json({ ok: true });
});
