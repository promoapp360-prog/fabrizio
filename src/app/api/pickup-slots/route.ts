import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { pickupDay, pickupTimes, romeDay } from "@/lib/pickup-times";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const now = new Date();
  const day = new URL(req.url).searchParams.get("date") || romeDay(now);
  const settings = await getSettings();
  return NextResponse.json({
    day, today: romeDay(now), lastDay: pickupDay(7, now),
    slots: pickupTimes(day, settings.ordering.prepMinutes, now),
  }, { headers: { "Cache-Control": "no-store" } });
}
