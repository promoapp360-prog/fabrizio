import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { DEFAULT_FAVICON, DEFAULT_SEO, resolveFavicon, resolveSeo } from "../src/lib/seo";
import { languages } from "../src/lib/i18n/languages";

describe("Presentazione del ristorante nei risultati di ricerca", () => {
  it("usa la descrizione scelta dal cliente e identifica ristorante e città", () => {
    expect(DEFAULT_SEO.description).toBe("Carni selezionate alla brace e sapori della tradizione materana. Scopri il menù e prenota.");
    expect(DEFAULT_SEO.title).toBe("Vecciarì – Grano & Brace | Ristorante a Matera");
  });

  it("aggiorna i valori iniziali già salvati senza scritture nel database", () => {
    expect(resolveSeo({
      title: "Vecciarì — Matera",
      description: "Vecciarì – Grano & Brace a Matera. Scopri il menu, il mondo della carne e prenota il tuo tavolo.",
    })).toEqual(DEFAULT_SEO);
    expect(resolveFavicon("/icon-32.png")).toBe(DEFAULT_FAVICON);
  });

  it("mantiene le personalizzazioni successive dell’Admin", () => {
    const custom = { title: "Titolo personalizzato", description: "Descrizione personalizzata." };
    expect(resolveSeo(custom)).toEqual(custom);
    expect(resolveSeo({ ...DEFAULT_SEO, description: custom.description }).description).toBe(custom.description);
    expect(resolveFavicon("/brand/icona-personalizzata.png")).toBe("/brand/icona-personalizzata.png");
  });

  it.each(languages.filter(language => language.code !== "it"))(
    "traduce titolo e descrizione in $name", ({ code }) => {
      const dictionary = JSON.parse(readFileSync(new URL(`../src/lib/i18n/dictionaries/${code}.json`, import.meta.url), "utf8"));
      expect(dictionary[DEFAULT_SEO.title]?.trim()).toBeTruthy();
      expect(dictionary[DEFAULT_SEO.description]?.trim()).toBeTruthy();
      expect(dictionary[DEFAULT_SEO.title]).toContain("Vecciarì");
    },
  );

  it.each([32, 96, 192, 512])("fornisce la fiamma in un PNG quadrato da %i pixel", size => {
    const png = readFileSync(new URL(`../public/icon-${size}.png`, import.meta.url));
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(size);
    expect(png.readUInt32BE(20)).toBe(size);
  });
});
