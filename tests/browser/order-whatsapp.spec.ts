import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import { ORDER_ID, PHONE, receipt, TOKEN } from "./data";

async function fillOrder(page: Page, source: "online" | "table", stripe: boolean) {
  await page.goto(source === "online" ? "/ordina" : `/t/${TOKEN}`);
  if (source === "table") await page.getByRole("button", { name: "Continua", exact: true }).click();
  await page.getByRole("button", { name: /Piatto browser/ }).click();
  await page.getByRole("button", { name: /Aggiungi/ }).click();
  if (source === "table") await page.getByRole("button", { name: /Carrello/ }).click();
  await page.getByLabel(source === "table" ? "Nome e cognome *" : "Nome di chi ritira *").fill("Cliente Browser");
  await page.getByLabel("Email per la conferma *").fill("browser@example.invalid");
  await page.getByLabel("Telefono *").fill("0000000000");
  if (source === "online") {
    await expect(page.getByLabel("Data", { exact: true })).toHaveValue("2030-06-01");
    await page.getByLabel("Orario", { exact: true }).selectOption({ label: "20:00" });
  }
  await page.getByRole("checkbox").check();
  if (stripe) await page.getByRole("radio", { name: "Paga online con Stripe", exact: true }).check();
}

for (const source of ["online", "table"] as const) {
  test(`${source}: checkout → PENDING → PAID, mai WhatsApp anticipato o duplicato`, async ({ page, network }) => {
    network.order = receipt(source === "table" ? "TABLE" : "TAKEAWAY");
    await page.clock.install();
    await fillOrder(page, source, true);
    expect(network.opens).toEqual([]);
    await page.getByRole("button", { name: "Conferma ordine e paga online", exact: true }).click();
    await expect.poll(() => network.orderPosts.length).toBe(1);
    // While order creation is still awaiting its response.
    expect(network.opens).toEqual([]);
    network.releaseOrder();
    await expect.poll(() => network.checkoutPosts).toBe(1);
    await expect(page).toHaveURL(new RegExp(`/ordine/${ORDER_ID}.*pay=online`));
    expect(network.opens).toEqual([]);
    await expect(page.getByRole("link", { name: "Apri WhatsApp", exact: true })).toHaveCount(0);
    expect(network.orderPosts[0].payment).toBe("STRIPE");

    network.order.onlinePayment = "pending";
    network.order.payments = [{ status: "PENDING", method: "STRIPE" }];
    network.releaseCheckout();
    await expect(page.getByRole("heading", { name: "Checkout Stripe intercettato" })).toBeVisible();
    expect(network.stripe).toHaveLength(1);
    expect(network.opens).toEqual([]);

    // This is the real return parameter; it is not evidence of payment.
    await page.goto(`/ordine/${ORDER_ID}?pagamento=verifica&whatsapp=1`);
    await expect(page.getByText(/Pagamento online aperto o in verifica/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Paga alla cassa", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Apri WhatsApp", exact: true })).toHaveCount(0);
    let reads = network.receiptGets;
    await page.clock.fastForward(16000);
    await expect.poll(() => network.receiptGets).toBeGreaterThan(reads);
    expect(network.opens).toEqual([]);
    expect(network.whatsapp).toEqual([]);

    network.order.onlinePayment = "paid";
    network.order.payments = [{ status: "PAID", method: "STRIPE" }];
    await page.clock.fastForward(8000);
    await expect(page.getByText("Pagamento online confermato da Stripe.", { exact: true })).toBeVisible();
    await expect.poll(() => network.whatsapp.length).toBe(1);
    expect(network.opens).toEqual(["about:blank"]);
    const url = new URL(network.whatsapp[0]);
    expect(url.pathname).toBe(`/${PHONE}`);
    expect(url.searchParams.get("text")).toContain("Stato pagamento: PAGATO (Stripe).");
    expect(url.searchParams.get("text")).toContain("Nome: Cliente Browser");
    expect(url.searchParams.get("text")).not.toContain("browser@example.invalid");
    await expect(page.getByRole("link", { name: "Apri WhatsApp", exact: true })).toHaveAttribute("href", url.href);

    reads = network.receiptGets;
    await page.clock.fastForward(24000);
    await expect.poll(() => network.receiptGets).toBeGreaterThan(reads);
    await page.reload();
    await expect(page.getByText("Pagamento online confermato da Stripe.", { exact: true })).toBeVisible();
    await page.clock.fastForward(16000);
    expect(network.opens).toEqual(["about:blank"]);
    expect(network.whatsapp).toHaveLength(1);
    expect(network.checkoutPosts).toBe(1);
    expect(network.orderPosts).toHaveLength(1);
  });

  test(`${source}: il valore cassa nel modulo non apre WhatsApp senza scelta nel riepilogo`, async ({ page, network }) => {
    network.order = receipt(source === "table" ? "TABLE" : "TAKEAWAY");
    await page.clock.install();
    await fillOrder(page, source, false);
    await expect(page.getByRole("radio", { name: "Alla cassa", exact: true })).toBeChecked();
    await page.getByRole("button", { name: "Conferma ordine · paga alla cassa", exact: true }).click();
    await expect.poll(() => network.orderPosts.length).toBe(1);
    expect(network.opens).toEqual([]);
    network.releaseOrder();
    await expect(page.getByRole("button", { name: "Paga alla cassa", exact: true })).toBeVisible();
    await page.clock.fastForward(16000);
    expect(network.opens).toEqual([]);
    expect(network.checkoutPosts).toBe(0);
    await expect(page.getByRole("link", { name: "Apri WhatsApp", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Paga alla cassa", exact: true }).click();
    await expect.poll(() => network.whatsapp.length).toBe(1);
    const message = new URL(network.whatsapp[0]).searchParams.get("text")!;
    expect(message).toContain(source === "table" ? "DA PAGARE ALLA CASSA." : "DA PAGARE AL RITIRO.");
    expect(message).not.toContain("PAGATO");
    expect(network.opens).toEqual(["about:blank"]);
    await page.clock.fastForward(16000);
    await page.reload();
    await expect(page.getByRole("link", { name: "Apri WhatsApp", exact: true })).toBeVisible();
    expect(network.opens).toEqual(["about:blank"]);
    expect(network.whatsapp).toHaveLength(1);
    expect(network.checkoutPosts).toBe(0);
  });
}

for (const state of ["ready", "pending"] as const) {
  test(`ritorno Stripe senza bozza: ${state} non diventa PAGATO dal parametro`, async ({ page, network }) => {
    network.order.onlinePayment = state;
    if (state === "pending") network.order.payments = [{ status: "PENDING", method: "STRIPE" }];
    await page.clock.install();
    await page.goto(`/ordine/${ORDER_ID}?pagamento=verifica&whatsapp=1`);
    await expect(page.getByRole("heading", { name: "Ordine n° 4242" })).toBeVisible();
    await page.clock.fastForward(24000);
    await expect(page.getByRole("link", { name: "Apri WhatsApp", exact: true })).toHaveCount(0);
    await expect(page.getByText("Pagamento online confermato da Stripe.", { exact: true })).toHaveCount(0);
    expect(network.opens).toEqual([]);
    expect(network.whatsapp).toEqual([]);
    expect(network.checkoutPosts).toBe(0);
    expect(network.orderPosts).toEqual([]);
  });
}
