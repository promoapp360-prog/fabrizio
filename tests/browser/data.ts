import type { MenuData } from "../../src/lib/menu";

// Synthetic data only. No database, restaurant contacts or credentials.
export const PHONE = "390000000000";
export const TOKEN = "browser-table";
export const ORDER_ID = "browser-order";
export const menu = {
  portionWeightsGrams: [500, 600], coverCents: 0,
  categories: [{ id: "food", name: "Piatti", parentId: null, description: null, image: "" }],
  promos: [],
  products: [{
    id: "pasta", name: "Piatto browser", description: null, ingredients: null, categoryId: "food",
    priceMode: "FIXED", priceCents: 1200, basePriceCents: 1200, takeawayPriceCents: null,
    estWeightGrams: null, hasCooking: false, image: "", images: [], available: true,
    channels: ["TABLE", "TAKEAWAY"], dailySpecial: false, offMenu: false, seasonal: false,
    origin: null, pairing: null, isDemo: false, specialty: false, recommended: false,
    pricePending: false, cutName: null, breedName: null, farming: null, ageing: null,
    cookingNotes: null, meatCharacteristics: null, breed: null, cut: null, allergens: [], groups: [],
  }],
} satisfies MenuData;

export function receipt(channel: "TABLE" | "TAKEAWAY" = "TAKEAWAY") {
  return {
    number: 4242, status: "RECEIVED", channel, tableNumber: channel === "TABLE" ? 1 : null,
    estimatedCents: 1200, finalCents: 1200, hasWeighted: false, pickupAt: null,
    emailStatus: "unavailable", payments: [] as { status: string; method: string }[],
    onlinePayment: "ready", pricingPolicy: "FIXED_PORTIONS", partySize: 1,
    coverCount: 0, coverUnitCents: 0, paymentMethod: "ON_PICKUP",
    items: [{
      nameSnapshot: "Piatto browser", quantity: 1, cooking: null, estWeightGrams: null,
      actualWeightGrams: null, lineEstCents: 1200, lineFinalCents: 1200,
    }],
  };
}
