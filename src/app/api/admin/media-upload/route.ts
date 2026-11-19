import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUser, AuthError } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { handle, HttpError } from "@/lib/api";
import { allowedMediaTypes, MAX_MEDIA_SIZE, objectFile, requestMediaUpload } from "@/lib/app-storage";

async function guardUpload() {
  const user = await getUser();
  if (!user) throw new AuthError(401);
  if (!can(user.role, "menu") && !can(user.role, "content")) throw new AuthError(403);
}
const schema = z.object({ name: z.string().min(1).max(200), contentType: z.string().refine(v => allowedMediaTypes.includes(v)), size: z.number().int().positive().max(MAX_MEDIA_SIZE) });
export const POST = handle(async (req: Request) => {
  await guardUpload();
  const d = schema.parse(await req.json());
  const { key, uploadURL } = await requestMediaUpload(d.contentType);
  const url = `/api/media/uploads/${key.split("/").at(-1)}`;
  const media = await db.media.create({ data: { key, url, mime: d.contentType, alt: d.name.replace(/\.[^.]+$/, ""), gallery: "__pending" } });
  return NextResponse.json({ id: media.id, uploadURL, url }, { status: 201 });
});
export const PATCH = handle(async (req: Request) => {
  await guardUpload();
  const { id, gallery } = z.object({ id: z.string(), gallery: z.string().max(100).nullable().optional() }).parse(await req.json());
  if (gallery?.startsWith("__")) throw new HttpError(400, "Nome galleria riservato");
  const media = await db.media.findUnique({ where: { id } });
  if (!media?.key || media.gallery !== "__pending") throw new HttpError(404, "Caricamento non trovato");
  const file = objectFile(process.env.PRIVATE_OBJECT_DIR || "", media.key);
  const [exists] = await file.exists();
  if (!exists) throw new HttpError(400, "Caricamento non completato");
  const [meta] = await file.getMetadata();
  if (Number(meta.size) > MAX_MEDIA_SIZE || meta.contentType !== media.mime) {
    await file.delete();
    await db.media.delete({ where: { id } });
    throw new HttpError(400, "Dimensione o formato del file non valido");
  }
  return NextResponse.json(await db.media.update({ where: { id }, data: { gallery: gallery || null } }));
});
