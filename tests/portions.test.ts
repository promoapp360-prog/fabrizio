import { describe, expect, it } from "vitest";
import { coverCharge, validPortionWeights } from "../src/lib/portions";
import { lineCents } from "../src/lib/pricing";

describe("pezzature a prezzo definitivo e coperti", () => {
  it("calcola 600 g a 60 €/kg come 36 € senza peso finale", () =>
    expect(lineCents({ priceMode: "PER_KG", unitCents: 6000, optionsCents: 0, quantity: 1, weightGrams: 600 })).toBe(3600));
  it("moltiplica correttamente pezzature, quantità e opzioni", () =>
    expect(lineCents({ priceMode: "PER_HG", unitCents: 600, optionsCents: 100, quantity: 2, weightGrams: 700 })).toBe(8600));
  it("accetta soltanto una lista di pesi interi distinti e nei limiti", () => {
    for (const weights of [[500, 600, 700, 800], [1000]]) expect(validPortionWeights(weights)).toBe(true);
    for (const weights of [[], [500, 500], [0, 600], [500.5], [5001], ["600"], null])
      expect(validPortionWeights(weights)).toBe(false);
  });
  it("aggiunge i coperti solo la prima volta per il gruppo", () => {
    expect(coverCharge("TABLE", 3, 0, 200)).toEqual({ count: 3, cents: 600 });
    expect(coverCharge("TABLE", 3, 3, 200)).toEqual({ count: 0, cents: 0 });
    expect(coverCharge("TABLE", 5, 3, 200)).toEqual({ count: 2, cents: 400 });
    expect(coverCharge("TABLE", 1, 3, 200)).toEqual({ count: 0, cents: 0 });
  });
  it("non applica mai coperti ad asporto o consegna", () => {
    expect(coverCharge("TAKEAWAY", 3, 0, 200)).toEqual({ count: 0, cents: 0 });
    expect(coverCharge("DELIVERY", 3, 0, 200)).toEqual({ count: 0, cents: 0 });
  });
});
