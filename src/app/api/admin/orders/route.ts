import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
// Lista ordini attivi (polling ogni 4s da sala e cucina). ?all=1 per lo storico.
export const GET = handle(async (req: Request) => {
  await requirePermission("orders.view");
  const all = new URL(req.url).searchParams.get("all");
  const orders = await db.order.findMany({
    where: all ? {} : { status: { in: ["RECEIVED", "CONFIRMED", "PREPARING", "READY"] } },
    include: { items: true, payments: true, customer: { select: { name: true, phone: true } } },
    orderBy: { createdAt: all ? "desc" : "asc" }, take: all ? 200 : undefined,
  });
  return NextResponse.json(orders);
});
