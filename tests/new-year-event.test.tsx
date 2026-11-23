import { describe, expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { languages } from "../src/lib/i18n/languages";
import { NEW_YEAR_EVENT, newYearMenu } from "../src/lib/new-year-event";

vi.mock("../src/components/public/ServerTranslated", () => ({ default: ({ children }: { children: ReactNode }) => children }));
vi.mock("next/link", () => ({ default: ({ children, href, ...props }: { children: ReactNode; href: string }) => createElement("a", { ...props, href }, children) }));
import Capodanno, { metadata } from "../src/app/(site)/capodanno-2026/page";

describe("serata Capodanno Vecciarì", () => {
  const html = () => renderToStaticMarkup(createElement(Capodanno));
  it("pubblica data, prezzo e capienza totali confermati, non quelli della locandina di Roma", () => {
    expect(NEW_YEAR_EVENT).toMatchObject({ date: "2026-12-31", priceCents: 6000, totalSeats: 100 });
    const page = html();
    for (const text of ["31 dicembre 2026", "60 € a persona", "100 posti totali"]) expect(page).toContain(text);
    expect(page).toContain("Cena con delitto da Vecciarì");
    expect(page).not.toContain("Capodanno con delitto");
    expect(page).not.toMatch(/15\s*€|ROMA|704|posti rimasti/);
    expect(metadata.title).toContain("Matera");
  });
  it("mantiene tutte le portate, le alternative, le bevande e l’avviso allergie forniti", () => {
    const page = html();
    expect(newYearMenu).toHaveLength(6);
    for (const section of newYearMenu) {
      expect(page).toContain(section.title);
      for (const dish of section.dishes) expect(page).toContain(dish);
    }
    expect(page).toContain("Comunicare eventuali allergie.");
  });
  it("indirizza le prenotazioni soltanto a VivoEventi, senza avviare ordini, Stripe o WhatsApp", () => {
    const page = html();
    expect(page.match(/href="https:\/\/vivoeventi\.com"/g)).toHaveLength(2);
    expect(page.match(/rel="noopener noreferrer"/g)).toHaveLength(2);
    expect(page).not.toMatch(/href="\/prenota|href="\/ordina|checkout\.stripe|wa\.me|<form/);
  });
  it.each(languages.filter(language => language.code !== "it"))("copre menù e richiamo in $name", ({ code }) => {
    const dictionary = JSON.parse(readFileSync(new URL(`../src/lib/i18n/dictionaries/${code}.json`, import.meta.url), "utf8"));
    const messages = ["31 dicembre 2026", "Cena con delitto da Vecciarì", "Scopri la serata",
      "60 € a persona · 100 posti totali", "Informazioni e prenotazioni su VivoEventi",
      "Comunicare eventuali allergie.", ...newYearMenu.flatMap(section => [section.title, ...section.dishes])];
    for (const message of messages) expect(dictionary[message]?.trim(), `${code}: ${message}`).toBeTruthy();
  });
});
