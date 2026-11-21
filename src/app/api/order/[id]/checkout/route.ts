import { NextResponse } from "next/server";
import { handle, clientIp, rateLimit } from "@/lib/api";
import { createCheckout, cancelCheckout, requirePaymentOrigin } from "@/lib/stripe-payments";
export const runtime = "nodejs";
export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const origin = requirePaymentOrigin(req); rateLimit(`checkout:${clientIp(req)}`, 10, 60_000);
  return NextResponse.json(await createCheckout((await params).id, origin), { headers: { "Cache-Control": "no-store" } });
});
export const DELETE = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  requirePaymentOrigin(req); rateLimit(`checkout-cancel:${clientIp(req)}`, 10, 60_000);
  return NextResponse.json(await cancelCheckout((await params).id));
});
