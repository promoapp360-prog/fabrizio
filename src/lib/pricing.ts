// Logica prezzi pura (testata in tests/pricing.test.ts).
export type PriceMode = "FIXED" | "PER_KG" | "PER_HG" | "PER_PORTION";

/** Prezzo di una riga. Per prodotti a peso usa il peso indicato (stimato o effettivo). */
export function lineCents(p: { priceMode: PriceMode; unitCents: number; optionsCents: number; quantity: number; weightGrams?: number | null }) {
  let base: number;
  switch (p.priceMode) {
    case "PER_KG": base = Math.round((p.unitCents * (p.weightGrams ?? 0)) / 1000); break;
    case "PER_HG": base = Math.round((p.unitCents * (p.weightGrams ?? 0)) / 100); break;
    default: base = p.unitCents;
  }
  return (base + p.optionsCents) * p.quantity;
}

export const isWeighted = (m: PriceMode) => m === "PER_KG" || m === "PER_HG";

export function formatEUR(cents: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export function priceLabel(mode: PriceMode, cents: number) {
  const f = formatEUR(cents);
  return mode === "PER_KG" ? `${f} / kg` : mode === "PER_HG" ? `${f} / hg` : mode === "PER_PORTION" ? `${f} a porzione` : f;
}
