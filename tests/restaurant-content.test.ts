import { describe, expect, it } from "vitest";
import { PRODUCT_COPY, RESTAURANT_CONTACTS, SITE_COPY, withoutDemoLabel } from "../src/lib/restaurant-content";

describe("contatti e testi pubblici", () => {
  it("usa lo stesso numero italiano per telefono e WhatsApp", () => {
    expect(RESTAURANT_CONTACTS.phone.replace(/\D/g, "")).toBe("393931380073");
    expect(RESTAURANT_CONTACTS.whatsapp).toBe(RESTAURANT_CONTACTS.phone.replace(/\D/g, ""));
  });
  it("riporta l'indirizzo comunicato dal cliente", () => {
    expect(RESTAURANT_CONTACTS.address).toBe("Via XX Settembre 14, 75100 Matera");
  });
  it("non reintroduce diciture dimostrative nei testi iniziali", () => {
    for (const copy of [...Object.values(PRODUCT_COPY), ...Object.values(SITE_COPY)]) {
      expect(Object.values(copy).join(" ")).not.toMatch(/\bdemo\b|dimostrativ|segnaposto|\besempio\b/i);
    }
  });
  it("rimuove solo il prefisso dai nomi, senza cancellare il prodotto", () => {
    expect(withoutDemoLabel("[DEMO] Costata alla brace")).toBe("Costata alla brace");
    expect(withoutDemoLabel("Patate al forno")).toBe("Patate al forno");
  });
});
