import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "./auth";

/** Wrapper uniforme per le route API: errori di validazione/permessi → JSON leggibile. */
export function handle<T extends unknown[]>(fn: (...a: T) => Promise<Response>) {
  return async (...a: T) => {
    try { return await fn(...a); }
    catch (e) {
      if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError) return NextResponse.json({ error: "Dati non validi", issues: e.flatten() }, { status: 400 });
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      console.error(e);
      return NextResponse.json({ error: "Errore interno" }, { status: 500 });
    }
  };
}
export class HttpError extends Error { constructor(public status: number, msg: string) { super(msg); } }

// Rate limit semplice in memoria (per istanza). Per più istanze sostituire con Redis.
const hits = new Map<string, { n: number; t: number }>();
export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now(); const h = hits.get(key);
  if (!h || now - h.t > windowMs) { hits.set(key, { n: 1, t: now }); return; }
  if (++h.n > max) throw new HttpError(429, "Troppe richieste, riprova tra poco");
}
export const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
