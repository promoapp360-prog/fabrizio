import { describe, it, expect } from "vitest";
import { lineCents, priceLabel } from "../src/lib/pricing";
describe("prezzi", () => {
  it("prezzo fisso × quantità + opzioni", () => expect(lineCents({ priceMode: "FIXED", unitCents: 1500, optionsCents: 400, quantity: 2 })).toBe(3800));
  it("al kg sul peso", () => expect(lineCents({ priceMode: "PER_KG", unitCents: 6000, optionsCents: 0, quantity: 1, weightGrams: 1250 })).toBe(7500));
  it("all'etto sul peso", () => expect(lineCents({ priceMode: "PER_HG", unitCents: 600, optionsCents: 0, quantity: 1, weightGrams: 950 })).toBe(5700));
  it("stima diversa dal definitivo", () => {
    const est = lineCents({ priceMode: "PER_HG", unitCents: 600, optionsCents: 0, quantity: 1, weightGrams: 1000 });
    const fin = lineCents({ priceMode: "PER_HG", unitCents: 600, optionsCents: 0, quantity: 1, weightGrams: 1180 });
    expect(fin).toBeGreaterThan(est);
  });
  it("etichetta", () => expect(priceLabel("PER_KG", 5500)).toMatch(/55,00.*kg/));
});
