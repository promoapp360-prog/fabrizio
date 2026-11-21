import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { handle } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { audit } from "@/lib/audit";
import { stripeConfigured } from "@/lib/payment-policy";
import { validPortionWeights } from "@/lib/portions";

export const GET = handle(async () => { await requirePermission("settings"); return NextResponse.json(await getSettings()); });
export const PUT = handle(async (req: Request) => {
  const b = await req.json();
  const { key, value } = z.object({ key: z.enum(["brand", "contacts", "ordering", "reservations", "seo", "cooking", "security"]), value: z.any() }).parse(b);
  let storedValue = value;
  // Il Responsabile può sospendere/riattivare gli ordini; il resto è del Super Admin.
  const u = await requirePermission(key === "ordering" ? "orders.manage" : "settings");
  if (key === "ordering") {
    if (!value || typeof value !== "object" || Array.isArray(value))
      return NextResponse.json({ error: "Impostazioni ordini non valide." }, { status: 400 });
    const current = await getSettings();
    if (value?.coverCents !== undefined && (!Number.isInteger(value.coverCents) || value.coverCents < 0 || value.coverCents > 100000))
      return NextResponse.json({ error: "Il coperto deve essere un importo valido tra 0 e 1000 €." }, { status: 400 });
    if (value?.portionWeightsGrams !== undefined && !validPortionWeights(value.portionWeightsGrams))
      return NextResponse.json({ error: "Inserisci da 1 a 20 pezzature distinte, tra 1 e 5000 grammi." }, { status: 400 });
    if (value?.coverCents !== undefined && value.coverCents !== current.ordering.coverCents ||
      value?.portionWeightsGrams !== undefined && JSON.stringify(value.portionWeightsGrams) !== JSON.stringify(current.ordering.portionWeightsGrams))
      await requirePermission("settings");
    if (value?.stripeEnabled !== undefined && value.stripeEnabled !== current.ordering.stripeEnabled) {
      await requirePermission("settings");
      if (value.stripeEnabled && !stripeConfigured())
        return NextResponse.json({ error: "Completa conto Stripe, webhook e indirizzo pubblico prima di attivare i pagamenti." }, { status: 400 });
    }
    // Pausing table orders sends a partial object; never erase fees or Stripe configuration.
    storedValue = { ...current.ordering, ...value };
  }
  if (key === "security") {
    const n = Number(value?.minPasswordLength);
    if (u.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Solo il Super Admin può modificare la sicurezza" }, { status: 403 });
    if (!Number.isInteger(n) || n < 1 || n > 30) return NextResponse.json({ error: "Lunghezza minima tra 1 e 30" }, { status: 400 });
  }
  await db.setting.upsert({ where: { key }, update: { value: storedValue }, create: { key, value: storedValue } });
  await audit(u.id, "settings_update", "Setting", key, storedValue);
  return NextResponse.json({ ok: true });
});
