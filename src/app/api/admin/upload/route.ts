import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle, HttpError } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { uploadFile, storageConfigured } from "@/lib/storage";

// Caricamento multiplo: FormData con più "files" (+ "gallery" opzionale).
export const POST = handle(async (req: Request) => {
  await requirePermission("content");
  if (!storageConfigured()) throw new HttpError(503, "Storage immagini non configurato: vedi Impostazioni › Integrazioni");
  const fd = await req.formData(); const gallery = (fd.get("gallery") as string) || null;
  const out = [];
  for (const f of fd.getAll("files")) {
    if (!(f instanceof File)) continue;
    const { key, url } = await uploadFile(f);
    out.push(await db.media.create({ data: { url, key, mime: f.type, alt: f.name.replace(/\.[^.]+$/, ""), gallery } }));
  }
  return NextResponse.json(out, { status: 201 });
});
