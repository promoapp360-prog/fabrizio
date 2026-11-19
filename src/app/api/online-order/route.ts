import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { handle, HttpError, rateLimit, clientIp } from "@/lib/api";
import { cartSchema, createOrder } from "@/lib/orders";
import { getSettings } from "@/lib/settings";

const schema = cartSchema.extend({
  channel: z.enum(["TAKEAWAY", "DELIVERY"]), pickupAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)),
  name: z.string().min(2).max(80), phone: z.string().min(6).max(20), email: z.string().email().optional().or(z.literal("")),
  address: z.string().max(200).optional(), privacy: z.literal(true), payment: z.enum(["ON_PICKUP", "STRIPE"]),
});

export const POST = handle(async (req: Request) => {
  rateLimit(`online:${clientIp(req)}`, 5, 60_000);
  const d = schema.parse(await req.json());
  const s = await getSettings();
  if (d.channel === "TAKEAWAY" && !s.ordering.takeawayEnabled) throw new HttpError(403, "Asporto non attivo");
  if (d.channel === "DELIVERY" && !s.ordering.deliveryEnabled) throw new HttpError(403, "Consegna non attiva");
  if (d.channel === "DELIVERY" && !d.address) throw new HttpError(400, "Indirizzo obbligatorio");
  if (d.payment === "STRIPE" && (!s.ordering.stripeEnabled || !process.env.STRIPE_SECRET_KEY)) throw new HttpError(400, "Pagamento online non disponibile");
  const pickupAt = new Date(d.pickupAt);
  if (pickupAt.getTime() < Date.now() + s.ordering.prepMinutes * 60000) throw new HttpError(400, `Serve un preavviso di almeno ${s.ordering.prepMinutes} minuti`);
  const email = d.email || null;
  const customer = email ? await db.customer.upsert({ where: { email }, update: { name: d.name, phone: d.phone }, create: { name: d.name, email, phone: d.phone } })
    : await db.customer.create({ data: { name: d.name, phone: d.phone } });
  await db.consent.create({ data: { customerId: customer.id, kind: "privacy", granted: true, source: "ordine online" } });
  const order = await createOrder(d, { channel: d.channel, customerId: customer.id, pickupAt, deliveryAddress: d.address, paymentMethod: d.payment });
  // Stripe: il checkout va creato qui con l'SDK ufficiale quando le chiavi sono configurate.
  return NextResponse.json({ id: order.id, number: order.number, stripe: d.payment === "STRIPE" ? "da_attivare" : null }, { status: 201 });
});
