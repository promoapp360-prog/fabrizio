import { db } from "@/lib/db";
import { handle, HttpError } from "@/lib/api";
import { serveMedia } from "@/lib/app-storage";

export const GET = handle(async (_req: Request, { params }: { params: Promise<{ path: string[] }> }) => {
  const { path } = await params;
  if (path[0] === "assets" && path.length === 2) {
    for (const base of (process.env.PUBLIC_OBJECT_SEARCH_PATHS || "").split(",").filter(Boolean)) {
      try { return await serveMedia(base.trim(), path.join("/")); }
      catch (e) { if (!(e instanceof HttpError) || e.status !== 404) throw e; }
    }
  }
  if (path[0] === "uploads" && path.length === 2) {
    const key = path.join("/");
    const media = await db.media.findFirst({ where: { key, OR: [{ gallery: null }, { gallery: { not: "__pending" } }] } });
    if (media) return serveMedia(process.env.PRIVATE_OBJECT_DIR || "", key);
  }
  throw new HttpError(404, "Immagine non trovata");
});
