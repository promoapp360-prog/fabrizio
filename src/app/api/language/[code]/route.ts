import { NextResponse } from "next/server";
import { isLanguage } from "@/lib/i18n/languages";
import { getDictionary } from "@/lib/i18n/server";

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!isLanguage(code)) return NextResponse.json({ error: "Lingua non disponibile" }, { status: 400 });
  return NextResponse.json(
    { language: code, dictionary: await getDictionary(code) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
