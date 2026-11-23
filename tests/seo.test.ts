import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { DEFAULT_FAVICON, DEFAULT_SEO, resolveFavicon, resolveSeo } from "../src/lib/seo";
import { languages } from "../src/lib/i18n/languages";
import { createRestaurantSchema } from "../src/lib/restaurant-schema";
import { RESTAURANT_CONTACTS, RESTAURANT_HOURS } from "../src/lib/restaurant-content";

const additionalSeoCopy = [
  "a Matera",
  "Ristorante con carne alla brace a Matera",
  "Scopri Vecciarì – Grano & Brace a Matera, in Via XX Settembre 14: carni selezionate e cucina alla brace, in un ambiente dedicato alla tradizione materana.",
  "Menù del ristorante a Matera",
  "Consulta il menù di Vecciarì a Matera: piatti, carni selezionate alla brace e proposte del ristorante. Contattaci per informazioni su ingredienti e allergeni.",
  "Prenota un tavolo a Matera",
  "Prenota online da Vecciarì, in Via XX Settembre 14 a Matera: scegli il giorno, il turno e l’orario disponibili per la tua visita.",
  "Ordina online a Matera",
  "Consulta il menù e verifica le modalità di ordine disponibili da Vecciarì, ristorante in Via XX Settembre 14 a Matera.",
  "Carni alla brace a Matera: razze e tagli",
  "Scopri razze, tagli e caratteristiche delle carni presentate da Vecciarì, ristorante alla brace in Via XX Settembre 14 a Matera.",
  "Privacy e dati personali",
  "Leggi l’informativa sul trattamento dei dati personali per prenotazioni, ordini e servizi del ristorante Vecciarì a Matera.",
  "Cookie policy del sito",
  "Scopri quali cookie utilizza il sito di Vecciarì a Matera e come gestire le preferenze per i cookie non essenziali.",
  "Cena con delitto a Matera, 31 dicembre 2026",
  "Il 31 dicembre 2026, cena con delitto da Vecciarì a Matera: menù di fine anno a 60 € a persona. Informazioni e prenotazioni su VivoEventi.",
];

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

  it.each(languages.filter(language => language.code !== "it"))(
    "traduce le descrizioni SEO delle pagine in $name", ({ code }) => {
      const dictionary = JSON.parse(readFileSync(new URL(`../src/lib/i18n/dictionaries/${code}.json`, import.meta.url), "utf8"));
      for (const phrase of additionalSeoCopy) {
        expect(dictionary[phrase]?.trim(), `${code}: ${phrase}`).toBeTruthy();
      }
    },
  );

  it("descrive il ristorante con indirizzo strutturato e orari confermati", () => {
    const schema = createRestaurantSchema({
      name: "Vecciarì",
      description: DEFAULT_SEO.description,
      address: RESTAURANT_CONTACTS.address,
      phone: RESTAURANT_CONTACTS.phone,
      mapsUrl: "https://maps.app.goo.gl/DCFUrHrw9Mc3NMbV9",
      instagram: "https://www.instagram.com/vecciari_granoebrace/",
      hours: RESTAURANT_HOURS,
    });
    expect(schema["@type"]).toBe("Restaurant");
    expect(schema.address).toEqual({
      "@type": "PostalAddress",
      streetAddress: "Via XX Settembre 14",
      postalCode: "75100",
      addressLocality: "Matera",
      addressCountry: "IT",
    });
    expect(schema.openingHoursSpecification).toHaveLength(2);
    expect(schema.sameAs).toHaveLength(2);
    expect(schema.menu).toContain("/menu");
  });

  it("non pubblica orari strutturati non più allineati al gestionale", () => {
    const schema = createRestaurantSchema({
      name: "Vecciarì",
      description: DEFAULT_SEO.description,
      address: RESTAURANT_CONTACTS.address,
      hours: "Orari diversi",
    });
    expect(schema.openingHoursSpecification).toBeUndefined();
  });

  it.each([32, 96, 192, 512])("fornisce la fiamma in un PNG quadrato da %i pixel", size => {
    const png = readFileSync(new URL(`../public/icon-${size}.png`, import.meta.url));
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(size);
    expect(png.readUInt32BE(20)).toBe(size);
  });

  it("fornisce un’immagine di anteprima social nel formato consigliato", () => {
    const imagePath = new URL("../public/brand/vecciari-social.jpg", import.meta.url);
    expect(readFileSync(imagePath).length).toBeGreaterThan(20_000);
    expect(readFileSync(imagePath).subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
  });
});
