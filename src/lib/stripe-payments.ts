import "server-only";
import { db } from "./db";
import { getSettings } from "./settings";
import { HttpError } from "./api";
import { onlinePaymentState, onlinePaymentsAvailable } from "./payment-policy";
import { getCheckoutSession, STRIPE_APPLICATION, stripeRequest, StripeProviderError, type StripeSession, type StripeEvent } from "./stripe-api";
import { sendOrderEmail } from "./order-email";

export function requirePaymentOrigin(req: Request) {
  const published = [process.env.PUBLIC_BASE_URL, ...(process.env.PUBLIC_PAYMENT_ORIGINS ?? "").split(",")]
    .filter((value): value is string => !!value?.trim()).map(value => {
      const url = new URL(value.trim());
      if (url.protocol !== "https:") throw new HttpError(503, "Indirizzo pubblico di pagamento non configurato correttamente.");
      return url.origin;
    });
  const allowed = [...published];
  if (/^(sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY ?? "") && !published.includes(req.headers.get("origin") ?? ""))
    throw new HttpError(503, "Pagamento online momentaneamente non disponibile.");
  if (process.env.NODE_ENV !== "production") {
    allowed.push(new URL(req.url).origin);
    if (process.env.REPLIT_DEV_DOMAIN) allowed.push(`https://${process.env.REPLIT_DEV_DOMAIN}`);
  }
  if (!allowed.includes(req.headers.get("origin") ?? "")) throw new HttpError(403, "Origine non valida");
}

async function priceForAmount(amount: number) {
  const lookup = `vecciari-eur-${amount}`;
  const prices = await stripeRequest<{ data: { id: string; currency: string; unit_amount: number; product: string; type: string }[] }>(`/prices?lookup_keys[]=${lookup}&active=true&limit=1`);
  if (prices.data[0]) {
    const price = prices.data[0];
    if (price.currency !== "eur" || price.unit_amount !== amount || price.product !== "vecciari_order_balance" || price.type !== "one_time")
      throw new HttpError(503, "Checkout Stripe non disponibile");
    return price.id;
  }
  let productId: string | undefined;
  try { productId = (await stripeRequest<{ id: string }>("/products/vecciari_order_balance")).id; }
  catch (error) { if (!(error instanceof StripeProviderError) || error.stripeStatus !== 404) throw error; }
  if (!productId) {
    const created = await stripeRequest<{ id: string }>("/products", {
      id: "vecciari_order_balance", name: "Vecciarì — saldo ordine",
      "metadata[application]": STRIPE_APPLICATION,
    }, "vecciari-balance-product");
    productId = created.id;
  }
  const price = await stripeRequest<{ id: string }>("/prices", {
    product: productId, currency: "eur", unit_amount: amount, lookup_key: lookup,
    "metadata[application]": STRIPE_APPLICATION,
  }, `vecciari-balance-price-${amount}`);
  return price.id;
}

/** Una sola prenotazione pagamento per ordine, serializzata con cassa e pesature. */
export async function createCheckout(orderId: string) {
  if (!onlinePaymentsAvailable()) throw new HttpError(503, "Pagamento online non ancora configurato");
  const settings = await getSettings();
  if (!settings.ordering.stripeEnabled) throw new HttpError(503, "Pagamento online sospeso dal ristorante");
  const initial = await db.order.findUnique({ where: { id: orderId }, include: { payments: true } });
  if (!initial) throw new HttpError(404, "Ordine non trovato");
  const initialState = onlinePaymentState(initial, settings.ordering.stripeEnabled, settings.ordering.payTiming);
  if (initialState !== "ready" && initialState !== "pending")
    throw new HttpError(409, "Pagamento non disponibile: attendi la conferma dell’importo o del ristorante.");
  // Le operazioni sul catalogo Stripe precedono il blocco dell'ordine.
  // Un errore di configurazione non deve impedire di pagare in cassa.
  const price = initial.payments.some(p => p.method === "STRIPE" && p.status === "PENDING" && p.externalRef)
    ? null : await priceForAmount(initial.finalCents!);
  const reservation = await db.$transaction(async tx => {
    const order = await tx.order.update({ where: { id: orderId }, data: { updatedAt: new Date() }, include: { payments: true } });
    const state = onlinePaymentState(order, settings.ordering.stripeEnabled, settings.ordering.payTiming);
    if (state !== "ready" && state !== "pending") throw new HttpError(409, "Pagamento non disponibile: attendi la conferma dell’importo o del ristorante.");
    if (!settings.ordering.stripeEnabled) throw new HttpError(503, "Pagamento online sospeso dal ristorante");
    if (order.finalCents !== initial.finalCents) throw new HttpError(409, "Importo aggiornato dal personale: ricarica il riepilogo.");
    const pending = order.payments.find(p => p.method === "STRIPE" && p.status === "PENDING");
    if (!pending && !price) throw new HttpError(409, "Pagamento aggiornato: ricarica il riepilogo.");
    const payment = pending ?? await tx.payment.create({ data: { orderId, method: "STRIPE", status: "PENDING", amountCents: order.finalCents! } });
    return { payment, number: order.number };
  });
  const { payment } = reservation;
  if (payment.externalRef) {
    const session = await getCheckoutSession(payment.externalRef);
    if (session.payment_status === "paid") {
      await settleSession(session);
      return { paid: true };
    }
    if (session.status === "open" && session.url) return { url: session.url };
    // Checkout concluso non equivale a pagamento fallito: la banca può
    // ancora confermare l'incasso. Sbloccare qui consentirebbe un doppio pagamento.
    if (session.status !== "expired")
      throw new HttpError(409, "Pagamento online aperto o in verifica. Non pagare nuovamente alla cassa finché il tentativo non è concluso o annullato.");
    await db.payment.updateMany({ where: { id: payment.id, status: "PENDING" }, data: { status: "FAILED" } });
    throw new HttpError(409, "Tentativo terminato. Premi nuovamente Paga online per riprovare.");
  }
  // Nessun URL è stato consegnato finché externalRef non è stato salvato.
  if (Date.now() - payment.createdAt.getTime() > 35 * 60_000) {
    await db.payment.updateMany({ where: { id: payment.id, status: "PENDING", externalRef: null }, data: { status: "FAILED" } });
    throw new HttpError(409, "Tentativo scaduto. Premi nuovamente Paga online per riprovare.");
  }
  const base = new URL(process.env.PUBLIC_BASE_URL!);
  if (base.protocol !== "https:") throw new HttpError(503, "Indirizzo pubblico non configurato");
  if (!price) throw new HttpError(409, "Pagamento aggiornato: ricarica il riepilogo.");
  const session = await stripeRequest<StripeSession>("/checkout/sessions", {
    mode: "payment", "payment_method_types[0]": "card",
    "line_items[0][price]": price, "line_items[0][quantity]": 1,
    client_reference_id: orderId,
    "metadata[application]": STRIPE_APPLICATION, "metadata[orderId]": orderId, "metadata[paymentId]": payment.id,
    "payment_intent_data[metadata][application]": STRIPE_APPLICATION,
    "payment_intent_data[metadata][orderId]": orderId, "payment_intent_data[metadata][paymentId]": payment.id,
    "payment_intent_data[description]": `Vecciarì — ordine n° ${reservation.number}`,
    success_url: `${base.origin}/ordine/${orderId}?pagamento=verifica`,
    cancel_url: `${base.origin}/ordine/${orderId}?pagamento=annullato`,
    expires_at: Math.floor(payment.createdAt.getTime() / 1000) + 31 * 60,
  }, `vecciari-checkout-${payment.id}`);
  if (!session.url || !session.url.startsWith("https://checkout.stripe.com/")) throw new HttpError(503, "Checkout Stripe non disponibile");
  await db.payment.update({ where: { id: payment.id }, data: { externalRef: session.id } });
  return { url: session.url };
}

export async function cancelCheckout(orderId: string) {
  if (!await db.order.findUnique({ where: { id: orderId }, select: { id: true } })) throw new HttpError(404, "Ordine non trovato");
  return db.$transaction(async tx => {
    const order = await tx.order.update({ where: { id: orderId }, data: { updatedAt: new Date() }, include: { payments: true } });
    const pending = order.payments.filter(p => p.method === "STRIPE" && p.status === "PENDING");
    for (const payment of pending) {
      if (!payment.externalRef) {
        if (Date.now() - payment.createdAt.getTime() < 35 * 60_000)
          throw new HttpError(409, "Checkout in preparazione. Attendi e riprova.");
      } else {
        let session = await getCheckoutSession(payment.externalRef);
        if (session.payment_status === "paid" || session.status === "complete")
          throw new HttpError(409, "Pagamento ricevuto da Stripe: attendi la conferma prima di registrare la cassa.");
        if (session.status === "open") session = await stripeRequest<StripeSession>(`/checkout/sessions/${session.id}/expire`, {});
        if (session.status !== "expired") throw new HttpError(409, "Pagamento online non ancora annullato");
      }
      await tx.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    }
    return { ok: true };
  }, { timeout: 30000 });
}

async function settleSession(session: StripeSession) {
  if (session.metadata?.application !== STRIPE_APPLICATION || session.payment_status !== "paid") return;
  const { paymentId, orderId } = session.metadata;
  if (!paymentId || !orderId) throw new HttpError(400, "Riferimento ordine mancante");
  const changed = await db.$transaction(async tx => {
    const order = await tx.order.update({ where: { id: orderId }, data: { updatedAt: new Date() }, include: { payments: true } });
    const payment = order.payments.find(p => p.id === paymentId && p.method === "STRIPE");
    if (!payment || payment.externalRef !== session.id || session.currency !== "eur" ||
      session.amount_total !== payment.amountCents || order.finalCents !== payment.amountCents)
      throw new HttpError(409, "Importo o riferimento Stripe non corrispondente");
    if (payment.status === "PAID" || payment.status === "REFUNDED") return false;
    if (payment.status !== "PENDING" || order.status === "CANCELLED" ||
      order.payments.some(p => p.id !== paymentId && p.status === "PAID")) throw new HttpError(409, "Pagamento da riconciliare con il ristorante");
    await tx.payment.update({ where: { id: paymentId }, data: { status: "PAID" } });
    await tx.order.update({ where: { id: orderId }, data: { paymentMethod: "STRIPE" } });
    return true;
  });
  // Si ritenta anche un'email fallita al replay; notify impedisce invii duplicati.
  if (changed || await db.payment.findFirst({ where: { id: paymentId, status: "PAID" } }))
    await sendOrderEmail(orderId, "PAID");
}

export async function processStripeEvent(event: StripeEvent) {
  const object = event.data.object;
  const metadata = object.metadata as Record<string, string> | undefined;
  if (metadata?.application !== STRIPE_APPLICATION) return;
  if (!metadata.orderId || !metadata.paymentId) throw new HttpError(400, "Riferimento pagamento mancante");
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    await settleSession(await getCheckoutSession(String(object.id)));
  } else if (["checkout.session.expired", "checkout.session.async_payment_failed"].includes(event.type)) {
    const session = await getCheckoutSession(String(object.id));
    if (session.payment_status === "paid") { await settleSession(session); return; }
    if (session.status !== "expired" && event.type !== "checkout.session.async_payment_failed") return;
    await db.$transaction(async tx => {
      await tx.order.update({ where: { id: metadata.orderId }, data: { updatedAt: new Date() } });
      await tx.payment.updateMany({ where: { id: metadata.paymentId, orderId: metadata.orderId, method: "STRIPE", status: "PENDING", externalRef: session.id }, data: { status: "FAILED" } });
    });
  } else if (event.type === "charge.refunded" && object.refunded === true) {
    const payment = await db.payment.findFirst({ where: { id: metadata.paymentId, orderId: metadata.orderId, method: "STRIPE" } });
    if (!payment?.externalRef) return;
    const session = await getCheckoutSession(payment.externalRef);
    if (session.payment_intent !== object.payment_intent || object.amount_refunded !== payment.amountCents) throw new HttpError(409, "Rimborso da riconciliare");
    await db.$transaction(async tx => {
      await tx.order.update({ where: { id: payment.orderId }, data: { updatedAt: new Date() } });
      await tx.payment.updateMany({ where: { id: payment.id, status: "PAID" }, data: { status: "REFUNDED" } });
    });
  }
}
