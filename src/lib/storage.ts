import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
/** Upload su storage S3-compatibile. Mai sul filesystem locale (effimero su Replit). */
export function storageConfigured() { return !!(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY); }
export async function uploadFile(file: File) {
  if (!storageConfigured()) throw new Error("Storage S3 non configurato");
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/avif", "video/mp4"];
  if (!allowed.includes(file.type)) throw new Error("Formato non consentito");
  if (file.size > 15 * 1024 * 1024) throw new Error("File troppo grande (max 15MB)");
  const s3 = new S3Client({ region: process.env.S3_REGION || "auto", endpoint: process.env.S3_ENDPOINT || undefined,
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! } });
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const key = `media/${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${ext}`;
  await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key, Body: Buffer.from(await file.arrayBuffer()), ContentType: file.type, CacheControl: "public, max-age=31536000, immutable" }));
  return { key, url: `${process.env.S3_PUBLIC_URL?.replace(/\/$/, "")}/${key}` };
}
