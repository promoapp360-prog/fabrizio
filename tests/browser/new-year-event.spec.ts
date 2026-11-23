import { test, expect } from "./fixtures";

for (const width of [375, 390, 768, 1440]) {
  test(`richiamo Capodanno sotto i pulsanti, senza overflow a ${width}px`, async ({ page, network }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/event-check");
    const teaser = page.locator(".new-year-teaser");
    await expect(teaser).toBeVisible();
    await expect(teaser).toHaveAttribute("href", "/capodanno-2026");
    await expect(teaser).not.toContainText(/60|100|€|posti|rimasti/);
    await expect(teaser.locator(".new-year-teaser-title")).toHaveCSS("font-family", /Kurdis/);
    expect(await teaser.locator(".new-year-teaser-title").evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(24);
    await expect(teaser.locator(".new-year-teaser-link")).toHaveCSS("color", "rgb(10, 10, 8)");
    const menu = await page.getByRole("link", { name: "Scopri il menu", exact: true }).boundingBox();
    const card = await teaser.boundingBox();
    expect(card!.y).toBeGreaterThan(menu!.y + menu!.height);
    expect(card!.x).toBeGreaterThanOrEqual(0);
    expect(card!.x + card!.width).toBeLessThanOrEqual(width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(network.orderPosts).toEqual([]);
    expect(network.opens).toEqual([]);
  });
}
test("richiamo tradotto e accessibile da tastiera, anche in ebraico", async ({ page, network }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/event-check?lang=es");
  await expect(page.locator(".new-year-teaser")).toContainText("Descubre la velada");
  await expect(page.locator(".new-year-teaser")).not.toContainText(/60|100|€/);
  await page.keyboard.press("Tab"); await page.keyboard.press("Tab"); await page.keyboard.press("Tab");
  await expect(page.locator(".new-year-teaser")).toBeFocused();
  await page.goto("/event-check?lang=he");
  await expect(page.locator(".new-year-teaser")).toContainText("גלו את הערב");
  await expect(page.locator(".new-year-teaser")).not.toContainText(/60|100|אירו/);
  await expect(page.locator(".new-year-teaser")).not.toContainText("Scopri la serata");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(network.unexpected).toEqual([]);
});
