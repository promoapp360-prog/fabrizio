import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle, HttpError } from "@/lib/api";
// Stato ordine pubblico: espone solo dati non sensibili.
export const GET = handle(async (_r: Request, { params }: { params: { id: string } }) => {
  const o = await db.order.findUnique({ where: { id: params.id }, select: { number: true, status: true, channel: true, estimatedCents: true, finalCents: true, hasWeighted: true, pickupAt: true } });
  if (!o) throw new HttpError(404, "Ordine non trovato");
  return NextResponse.json(o);
});
