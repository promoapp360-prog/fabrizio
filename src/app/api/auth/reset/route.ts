import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { handle, HttpError, rateLimit, clientIp } from "@/lib/api";
import { hashPassword, passwordPolicy } from "@/lib/auth";
import { secureToken } from "@/lib/util";
import { notify } from "@/lib/notify";
import { audit } from "@/lib/audit";

// POST {email} → invia link; POST {token,password} → imposta nuova password.
export const POST = handle(async (req: Request) => {
  rateLimit(`reset:${clientIp(req)}`, 5, 15 * 60_000);
  const body = await req.json();
  if (body.token) {
    const { token, password } = z.object({ token: z.string(), password: z.string() }).parse(body);
    const err = passwordPolicy(password); if (err) throw new HttpError(400, err);
    const u = await db.user.findFirst({ where: { resetToken: token, resetExpires: { gt: new Date() } } });
    if (!u) throw new HttpError(400, "Link scaduto o non valido");
    await db.user.update({ where: { id: u.id }, data: { passwordHash: await hashPassword(password), resetToken: null, resetExpires: null } });
    await audit(u.id, "password_reset", "User", u.id);
    return NextResponse.json({ ok: true });
  }
  const { email } = z.object({ email: z.string().email() }).parse(body);
  const u = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (u?.active) {
    const token = secureToken(32);
    await db.user.update({ where: { id: u.id }, data: { resetToken: token, resetExpires: new Date(Date.now() + 3600_000) } });
    await notify({ channel: "email", to: u.email, subject: "Reimposta password", body: `${process.env.PUBLIC_BASE_URL}/admin/reset?token=${token}` });
  }
  return NextResponse.json({ ok: true }); // risposta identica: non rivela se l'email esiste
});
