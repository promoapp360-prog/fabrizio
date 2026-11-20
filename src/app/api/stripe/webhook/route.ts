import { NextResponse } from "next/server";
import { verifiedStripeEvent } from "@/lib/stripe-api";
import { processStripeEvent } from "@/lib/stripe-payments";
import { HttpError } from "@/lib/api";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    const payload = await req.text();
    if (Buffer.byteLength(payload) > 1_048_576) return NextResponse.json({ error: "Evento troppo grande" }, { status: 413 });
    const event = verifiedStripeEvent(payload, req.headers.get("stripe-signature"));
    await processStripeEvent(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    // Nessun payload, chiave, firma, dato carta o dettaglio cliente nei log.
    return NextResponse.json({ error: "Webhook Stripe non elaborato" }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
