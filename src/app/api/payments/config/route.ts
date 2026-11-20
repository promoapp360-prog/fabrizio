import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { onlinePaymentsAvailable } from "@/lib/payment-policy";
export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({ online: settings.ordering.stripeEnabled && onlinePaymentsAvailable() }, { headers: { "Cache-Control": "no-store" } });
}
