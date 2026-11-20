import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { handle } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { audit } from "@/lib/audit";
import { stripeConfigured } from "@/lib/payment-policy";

export const GET = handle(async () => { await requirePermission("settings"); return NextResponse.json(await getSettings()); });
export const PUT = handle(async (req: Request) => {
  const b = await req.json();
  const { key, value } = z.object({ key: z.enum(["brand", "contacts", "ordering", "reservations", "seo", "cooking", "security"]), value: z.any() }).parse(b);
  // Il Responsabile può sospendere/riattivare gli ordini; il resto è del Super Admin.
  const u = await requirePermission(key === "ordering" ? "orders.manage" : "settings");
  if (key === "ordering") {
    const current = await getSettings();
    if (value?.stripeEnabled !== undefined && value.stripeEnabled !== current.ordering.stripeEnabled) {
      await requirePermission("settings");
      if (value.stripeEnabled && !stripeConfigured())
        return NextResponse.json({ error: "Completa conto Stripe, webhook e indirizzo pubblico prima di attivare i pagamenti." }, { status: 400 });
    }
  }
  if (key === "security") {
    const n = Number(value?.minPasswordLength);
    if (u.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Solo il Super Admin può modificare la sicurezza" }, { status: 403 });
    if (!Number.isInteger(n) || n < 1 || n > 30) return NextResponse.json({ error: "Lunghezza minima tra 1 e 30" }, { status: 400 });
  }
  await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  await audit(u.id, "settings_update", "Setting", key, value);
  return NextResponse.json({ ok: true });
});
