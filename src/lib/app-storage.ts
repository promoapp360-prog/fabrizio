import { Storage } from "@google-cloud/storage";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { HttpError } from "./api";

// Replit sidecar authentication: no service-account keys or shared-client credentials.
export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: "http://127.0.0.1:1106/token",
    type: "external_account",
    credential_source: { url: "http://127.0.0.1:1106/credential", format: { type: "json", subject_token_field_name: "access_token" } },
    universe_domain: "googleapis.com",
  },
  // Bucket-scoped calls use the bucket provisioned by Replit, not project APIs.
  // Storage 9 requires a non-empty identifier even for these calls.
  projectId: "replit",
});
export function objectFile(base: string, key: string) {
  if (!base || !/^[a-zA-Z0-9/_\-.]+$/.test(key) || key.split("/").some(p => p === "." || p === "..")) throw new HttpError(404, "Immagine non trovata");
  const [bucket, ...parts] = base.replace(/^\/+|\/+$/g, "").split("/");
  return objectStorageClient.bucket(bucket).file([...parts, key].join("/"));
}
export const allowedMediaTypes = ["image/jpeg", "image/png", "image/webp", "image/avif", "video/mp4"];
export const MAX_MEDIA_SIZE = 15 * 1024 * 1024;

export async function requestMediaUpload(mime: string) {
  if (!process.env.PRIVATE_OBJECT_DIR) throw new HttpError(503, "Archivio immagini non configurato");
  const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "video/mp4": "mp4" }[mime];
  if (!ext) throw new HttpError(400, "Formato non consentito");
  const key = `uploads/${randomUUID()}.${ext}`;
  const file = objectFile(process.env.PRIVATE_OBJECT_DIR, key);
  const response = await fetch("http://127.0.0.1:1106/object-storage/signed-object-url", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bucket_name: file.bucket.name, object_name: file.name, method: "PUT", expires_at: new Date(Date.now() + 900_000).toISOString() }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new HttpError(503, "Impossibile predisporre il caricamento. Riprova.");
  const { signed_url } = await response.json();
  return { key, uploadURL: signed_url as string };
}
export async function serveMedia(base: string, key: string) {
  const file = objectFile(base, key);
  const [exists] = await file.exists();
  if (!exists) throw new HttpError(404, "Immagine non trovata");
  const [meta] = await file.getMetadata();
  const mime = String(meta.contentType || "");
  if (!allowedMediaTypes.includes(mime)) throw new HttpError(404, "Formato non pubblico");
  return new Response(Readable.toWeb(file.createReadStream()) as ReadableStream, {
    headers: { "Content-Type": mime, "Content-Length": String(meta.size), "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" },
  });
}
