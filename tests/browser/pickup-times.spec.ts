import { test, expect } from "./fixtures";

test("ritiro: data e ora separate, lunedì chiuso e selezione azzerata al cambio giorno", async ({ page, network }) => {
  await page.goto("/ordina");
  await page.getByRole("button", { name: /Piatto browser/ }).click();
  await page.getByRole("button", { name: /Aggiungi/ }).click();
  const date = page.getByLabel("Data", { exact: true });
  const time = page.getByLabel("Orario", { exact: true });
  await expect(date).toHaveValue("2030-06-01");
  await expect(date).toHaveAttribute("min", "2030-06-01");
  await expect(date).toHaveAttribute("max", "2030-06-08");
  await time.selectOption({ label: "20:00" });
  await expect(time).toHaveValue("2030-06-01T18:00:00.000Z");
  await expect(page.getByText("01/06/2030 · 20:00", { exact: true })).toBeVisible();
  await date.fill("2030-06-03");
  await expect(time).toHaveValue("");
  await expect(time).toBeDisabled();
  await expect(page.getByText("Nessun orario disponibile per questo giorno. Scegli un’altra data.")).toBeVisible();
  await date.fill("2030-06-04");
  await expect(time).toBeEnabled();
  await expect(time).toHaveValue("");
  await time.selectOption({ label: "12:00" });
  await expect(time).toHaveValue("2030-06-04T10:00:00.000Z");
  expect(network.orderPosts).toEqual([]);
  expect(network.opens).toEqual([]);
});

test("un orario scaduto mentre si compila viene tolto senza sostituirlo automaticamente", async ({ page, network }) => {
  await page.clock.install();
  await page.goto("/ordina");
  await page.getByRole("button", { name: /Piatto browser/ }).click();
  await page.getByRole("button", { name: /Aggiungi/ }).click();
  const time = page.getByLabel("Orario", { exact: true });
  await time.selectOption({ label: "19:00" });
  network.pickupNow = new Date("2030-06-01T16:45:00Z");
  await page.clock.fastForward(30000);
  await expect(time).toHaveValue("");
  await expect(time.locator("option").filter({ hasText: /^19:00$/ })).toHaveCount(0);
  expect(network.orderPosts).toEqual([]);
});
