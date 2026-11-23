import { test, expect } from "./fixtures";
import en from "../../src/lib/i18n/dictionaries/en.json";
import fr from "../../src/lib/i18n/dictionaries/fr.json";

test("inglese e francese nel selettore, senza perdere il giorno scelto per prenotare", async ({ page, network, context }) => {
  await page.clock.install({ time: new Date("2026-11-21T10:00:00Z") });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/language-check");
  await page.getByRole("button", { name: /29 novembre 2026/ }).click();
  await page.getByRole("button", { name: "Scegli la lingua", exact: true }).click();
  await expect(page.getByRole("button", { name: "English", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Français", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(page.getByRole("button", { name: en["Scegli la lingua"], exact: true })).toContainText("EN");
  await expect(page.getByRole("button", { name: /29 November 2026/i })).toHaveAttribute("aria-pressed", "true");
  expect((await context.cookies()).find(cookie => cookie.name === "vecciari_language")?.value).toBe("en");
  await page.getByRole("button", { name: en["Scegli la lingua"], exact: true }).click();
  await page.getByRole("button", { name: "Français", exact: true }).click();
  await expect(page.getByRole("button", { name: fr["Scegli la lingua"], exact: true })).toContainText("FR");
  await expect(page.getByRole("button", { name: /29 novembre 2026/i })).toHaveAttribute("aria-pressed", "true");
  expect((await context.cookies()).find(cookie => cookie.name === "vecciari_language")?.value).toBe("fr");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(network.orderPosts).toEqual([]);
  expect(network.opens).toEqual([]);
  expect(network.unexpected).toEqual([]);
});
