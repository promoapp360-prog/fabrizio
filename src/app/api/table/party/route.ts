import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { handle, rateLimit, clientIp } from "@/lib/api";
import { getSettings } from "@/lib/settings";

const schema = z.object({ tableNumber: z.number().int().positive().max(999), diningGroupKey: z.string().uuid() });
// Only a random group capability and counts, never customer identities or orders.
export const POST = handle(async (req: Request) => {
  rateLimit(`party:${clientIp(req)}`, 60, 60_000);
  const input = schema.parse(await req.json());
  const table = await db.table.findUnique({ where: { number: input.tableNumber } });
  const session = table?.active ? await db.tableSession.findFirst({
    where: { tableId: table.id, closedAt: null }, orderBy: { openedAt: "desc" },
  }) : null;
  const covered = session ? await db.order.aggregate({
    where: { sessionId: session.id, diningGroupKey: input.diningGroupKey, status: { not: "CANCELLED" } },
    _sum: { coverCount: true },
  }) : null;
  const settings = await getSettings();
  return NextResponse.json({ validTable: !!table?.active, coveredCount: covered?._sum.coverCount ?? 0,
    coverCents: settings.ordering.coverCents }, { headers: { "Cache-Control": "no-store" } });
});
