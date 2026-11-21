import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { onlinePaymentsAvailable } from "@/lib/payment-policy";
export async function GET() {
  const settings = await getSettings();
  const available = onlinePaymentsAvailable();
  const online = settings.ordering.stripeEnabled && available;
  return NextResponse.json({
    online,
    previewPaymentsBlocked: process.env.NODE_ENV !== "production" && !online,
  }, { headers: { "Cache-Control": "no-store" } });
}
