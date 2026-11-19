import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { handle, HttpError, clientIp } from "@/lib/api";
import { createSession, findUserByPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";

// Blocco per IP: dopo 8 tentativi falliti in 15 minuti l'IP resta bloccato per 15 minuti.
const fails = new Map<string, { n: number; t: number }>();
const WINDOW = 15 * 60_000, MAX = 8;

export const POST = handle(async (req: Request) => {
  const ip = clientIp(req); const now = Date.now(); const f = fails.get(ip);
  if (f && now - f.t < WINDOW && f.n >= MAX) throw new HttpError(429, "Troppi tentativi errati. Riprova tra 15 minuti.");
  const { password } = z.object({ password: z.string().min(1).max(200) }).parse(await req.json());
  const u = await findUserByPassword(password);
  if (!u) {
    fails.set(ip, f && now - f.t < WINDOW ? { n: f.n + 1, t: f.t } : { n: 1, t: now });
    await audit(null, "login_failed", "User", undefined, { ip });
    throw new HttpError(401, "Password non valida");
  }
  fails.delete(ip);
  await createSession({ id: u.id, name: u.name, role: u.role });
  await db.user.update({ where: { id: u.id }, data: { lastLoginAt: new Date() } });
  await audit(u.id, "login", "User", u.id);
  return NextResponse.json({ ok: true, role: u.role });
});
