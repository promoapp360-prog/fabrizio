export const DEFAULT_PORTION_WEIGHTS = [500, 600, 700, 800];
export const FIXED_PORTIONS = "FIXED_PORTIONS";
export const PORTION_NOTICE = "Il peso effettivo può variare leggermente. Il prezzo della pezzatura scelta è definitivo e non cambia.";

export function validPortionWeights(value: unknown): value is number[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 20 &&
    value.every(n => Number.isInteger(n) && n >= 1 && n <= 5000) &&
    new Set(value).size === value.length;
}

export function coverCharge(channel: string, people: number, alreadyCovered: number, unitCents: number) {
  const count = channel === "TABLE" ? Math.max(0, people - alreadyCovered) : 0;
  return { count, cents: count * unitCents };
}
