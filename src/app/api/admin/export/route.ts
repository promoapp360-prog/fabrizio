import { db } from "@/lib/db";
import { handle } from "@/lib/api";
import { requirePermission } from "@/lib/auth";

const csv = (rows: (string | number | null)[][]) => rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");

// GET ?report=orders|products|reservations&from&to → CSV (separatore ; per Excel IT)
export const GET = handle(async (req: Request) => {
  await requirePermission("stats");
  const u = new URL(req.url); const report = u.searchParams.get("report") ?? "orders";
  const from = new Date(u.searchParams.get("from") ?? Date.now() - 30 * 86400000), to = new Date(u.searchParams.get("to") ?? Date.now());
  let rows: (string | number | null)[][] = [];
  if (report === "orders") {
    const os = await db.order.findMany({ where: { createdAt: { gte: from, lte: to } }, include: { payments: true } });
    rows = [["Numero", "Data", "Canale", "Tavolo", "Stato", "Totale stimato €", "Totale definitivo €", "Incassato €"],
      ...os.map(o => [o.number, o.createdAt.toISOString(), o.channel, o.tableNumber, o.status, o.estimatedCents / 100, o.finalCents != null ? o.finalCents / 100 : null, o.payments.filter(p => p.status === "PAID").reduce((s, p) => s + p.amountCents, 0) / 100])];
  } else if (report === "products") {
    const g = await db.orderItem.groupBy({ by: ["nameSnapshot"], where: { order: { createdAt: { gte: from, lte: to }, status: { not: "CANCELLED" } } }, _sum: { quantity: true, lineEstCents: true } });
    rows = [["Prodotto", "Quantità", "Valore ordinato €"], ...g.sort((a, b) => (b._sum.quantity ?? 0) - (a._sum.quantity ?? 0)).map(x => [x.nameSnapshot, x._sum.quantity, (x._sum.lineEstCents ?? 0) / 100])];
  } else {
    const rs = await db.reservation.findMany({ where: { startsAt: { gte: from, lte: to } }, include: { customer: true, table: true } });
    rows = [["Codice", "Data", "Persone", "Stato", "Cliente", "Tavolo", "Origine"], ...rs.map(r => [r.code, r.startsAt.toISOString(), r.people, r.status, r.customer.name, r.table?.number ?? null, r.source])];
  }
  return new Response("﻿" + csv(rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${report}.csv"` } });
});
