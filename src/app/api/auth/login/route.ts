import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { handle, HttpError, rateLimit, clientIp } from "@/lib/api";
import { createSession, verifyPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const POST = handle(async (req: Request) => {
  rateLimit(`login:${clientIp(req)}`, 8, 15 * 60_000);
  const { email, password } = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(await req.json());
  const u = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!u || !u.active || !(await verifyPassword(password, u.passwordHash))) throw new HttpError(401, "Credenziali non valide");
  await createSession({ id: u.id, name: u.name, email: u.email, role: u.role });
  await db.user.update({ where: { id: u.id }, data: { lastLoginAt: new Date() } });
  await audit(u.id, "login", "User", u.id);
  return NextResponse.json({ ok: true, role: u.role });
});
