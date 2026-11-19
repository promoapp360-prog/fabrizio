import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { handle } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { audit } from "@/lib/audit";

export const GET = handle(async () => { await requirePermission("settings"); return NextResponse.json(await getSettings()); });
export const PUT = handle(async (req: Request) => {
  const b = await req.json();
  const { key, value } = z.object({ key: z.enum(["brand", "contacts", "ordering", "reservations", "seo", "cooking"]), value: z.any() }).parse(b);
  // Il Responsabile può sospendere/riattivare gli ordini; il resto è del Super Admin.
  const u = await requirePermission(key === "ordering" ? "orders.manage" : "settings");
  await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  await audit(u.id, "settings_update", "Setting", key, value);
  return NextResponse.json({ ok: true });
});
