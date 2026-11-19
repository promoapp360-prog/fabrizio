import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { handle, HttpError, rateLimit, clientIp } from "@/lib/api";
import { cartSchema, createOrder } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { customerOrderSchema, requireCounterPayment } from "@/lib/checkout";
import { sendOrderEmail } from "@/lib/order-email";

const schema = cartSchema.merge(customerOrderSchema).extend({
  channel: z.enum(["TABLE", "TAKEAWAY", "DELIVERY"]),
  tableNumber: z.number().int().positive().max(999).optional(),
  pickupAt: z.string().datetime({ offset: true }).optional(),
  address: z.string().trim().max(200).optional(),
  payment: z.enum(["AT_COUNTER", "ON_PICKUP", "STRIPE"]),
});

export const POST = handle(async (req: Request) => {
  rateLimit(`online:${clientIp(req)}`, 12, 60_000);
  const d = schema.parse(await req.json());
  const s = await getSettings();
  if (!requireCounterPayment(d.payment)) throw new HttpError(503, "Stripe non è ancora collegato: scegli il pagamento alla cassa.");
  if (d.channel === "TABLE" && !s.ordering.tableEnabled) throw new HttpError(403, "Ordini al tavolo sospesi");
  if (d.channel === "TAKEAWAY" && !s.ordering.takeawayEnabled) throw new HttpError(403, "Asporto non attivo");
  if (d.channel === "DELIVERY" && !s.ordering.deliveryEnabled) throw new HttpError(403, "Consegna non attiva");
  if (d.channel === "TABLE") {
    if (!d.tableNumber || !await db.table.findFirst({ where: { number: d.tableNumber, active: true } }))
      throw new HttpError(400, "Inserisci il numero di un tavolo attivo del ristorante");
  }
  if (d.channel === "DELIVERY" && !d.address) throw new HttpError(400, "Indirizzo obbligatorio");
  const pickupAt = d.channel === "TABLE" ? undefined : d.pickupAt ? new Date(d.pickupAt) : undefined;
  if (d.channel !== "TABLE" && (!pickupAt || !Number.isFinite(pickupAt.getTime()) ||
    pickupAt.getTime() < Date.now() + s.ordering.prepMinutes * 60000 ||
    pickupAt.getTime() > Date.now() + 7 * 86400000))
    throw new HttpError(400, `Scegli un orario nei prossimi 7 giorni con almeno ${s.ordering.prepMinutes} minuti di preavviso`);
  const customer = await db.customer.upsert({
    where: { email: d.email }, update: { name: d.name, phone: d.phone },
    create: { name: d.name, email: d.email, phone: d.phone },
  });
  const order = await createOrder(d, {
    channel: d.channel, customerId: customer.id, customerName: d.name, tableNumber: d.channel === "TABLE" ? d.tableNumber : undefined,
    pickupAt, deliveryAddress: d.channel === "DELIVERY" ? d.address : undefined,
    paymentMethod: d.channel === "TABLE" ? "AT_COUNTER" : "ON_PICKUP",
  });
  if (!await db.consent.findFirst({ where: { customerId: customer.id, kind: "privacy", source: `ordine:${order.id}` } }))
    await db.consent.create({ data: { customerId: customer.id, kind: "privacy", granted: true, source: `ordine:${order.id}`, textVersion: "privacy-ordini-1" } });
  const notification = await sendOrderEmail(order.id);
  return NextResponse.json({ id: order.id, number: order.number, emailStatus: notification?.status ?? "not_available" }, { status: 201 });
});
