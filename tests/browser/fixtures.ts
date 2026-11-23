import { test as base, expect } from "@playwright/test";
import en from "../../src/lib/i18n/dictionaries/en.json";
import fr from "../../src/lib/i18n/dictionaries/fr.json";
import { ORDER_ID, receipt, TOKEN } from "./data";
import { pickupDay, pickupTimes, romeDay } from "../../src/lib/pickup-times";

const ORIGIN = "http://127.0.0.1:4179";
const STRIPE = "https://checkout.stripe.com/c/pay/browser-only";

export const test = base.extend<{ network: Awaited<ReturnType<typeof intercept>> }>({
  network: async ({ context }, use) => {
    const network = await intercept(context);
    await use(network);
    expect(network.unexpected, "Unexpected requests must never reach a real service").toEqual([]);
  },
});
export { expect };

async function intercept(context: import("@playwright/test").BrowserContext) {
  const state = {
    pickupNow: new Date("2030-06-01T16:00:00Z"),
    order: receipt(), orderPosts: [] as Record<string, unknown>[], checkoutPosts: 0, receiptGets: 0,
    opens: [] as string[], whatsapp: [] as string[], stripe: [] as string[], unexpected: [] as string[],
    releaseOrder: () => {}, releaseCheckout: () => {},
  };
  let releaseOrder!: () => void, releaseCheckout!: () => void;
  const orderGate = new Promise<void>(resolve => { releaseOrder = resolve; });
  const checkoutGate = new Promise<void>(resolve => { releaseCheckout = resolve; });
  state.releaseOrder = releaseOrder; state.releaseCheckout = releaseCheckout;

  await context.exposeBinding("recordWindowOpen", (_source, url: string) => { state.opens.push(url); });
  await context.addInitScript(() => {
    const original = window.open.bind(window);
    window.open = (...args) => {
      // Observe even about:blank: an early reserved popup is a regression too.
      void (window as unknown as { recordWindowOpen: (url: string) => Promise<void> }).recordWindowOpen(String(args[0]));
      return original(...args);
    };
  });

  // Browser-context interception includes popups' first requests. The isolated
  // static server has no API handlers and no connection to the application DB.
  await context.route("**/*", async route => {
    const request = route.request(), url = new URL(request.url());
    const method = request.method(), path = url.pathname;
    const json = (body: unknown) => route.fulfill({ json: body });
    if (url.origin === ORIGIN) {
      if (method === "GET" && (path === "/api/language/en" || path === "/api/language/fr")) {
        const code = path.split("/").pop()!;
        return json({ language: code, dictionary: code === "en" ? en : fr });
      }
      if (method === "POST" && (path === "/api/online-order" || path === `/api/table/${TOKEN}/order`)) {
        state.orderPosts.push(request.postDataJSON());
        await orderGate;
        return json({ id: ORDER_ID, number: 4242, totalCents: 1200, emailStatus: "unavailable" });
      }
      if (method === "POST" && path === `/api/order/${ORDER_ID}/checkout`) {
        state.checkoutPosts++;
        await checkoutGate;
        return json({ url: STRIPE });
      }
      if (method === "GET" && path === `/api/order/${ORDER_ID}`) {
        state.receiptGets++;
        return json(state.order);
      }
      if (method === "GET" && path === "/api/payments/config") return json({ online: true });
      if (method === "GET" && path === "/api/reservations") {
        const date = url.searchParams.get("date")!;
        const closed = new Date(`${date}T12:00:00Z`).getUTCDay() === 1;
        return json({ date, people: 2, open: !closed, closed: closed ? "Lunedì chiuso" : null,
          slots: closed ? [] : ["19:00"], services: [] });
      }
      if (method === "GET" && path === "/api/pickup-slots") {
        const day = url.searchParams.get("date") || romeDay(state.pickupNow);
        return json({ day, today: romeDay(state.pickupNow), lastDay: pickupDay(7, state.pickupNow),
          slots: pickupTimes(day, 30, state.pickupNow) });
      }
      if (method === "POST" && path === "/api/table/party")
        return json({ validTable: true, coveredCount: 0, coverCents: 0 });
      if (method === "GET" && path === `/api/table/${TOKEN}/order`) return json({ orders: [] });
      // Only static harness/compiled modules may reach Vite, never an API or a
      // mutation. Adding a new application endpoint requires an explicit mock.
      if (method === "GET" && !path.startsWith("/api/")) return route.continue();
    }
    if (url.hostname === "checkout.stripe.com" && method === "GET" && request.isNavigationRequest()) {
      state.stripe.push(request.url());
      return route.fulfill({ contentType: "text/html", body: "<h1>Checkout Stripe intercettato</h1>" });
    }
    if (url.hostname === "wa.me" && method === "GET" && request.isNavigationRequest()) {
      state.whatsapp.push(request.url());
      return route.fulfill({ contentType: "text/html", body: "<h1>WhatsApp intercettato: nessun messaggio inviato</h1>" });
    }
    state.unexpected.push(`${method} ${url.origin}${path}`);
    return route.abort("blockedbyclient");
  });
  return state;
}
