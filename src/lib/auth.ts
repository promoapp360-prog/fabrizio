import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { can, type Permission, type Role } from "./rbac";
import { getSettings } from "./settings";

const COOKIE = "vc_session";
const secret = () => {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET mancante o troppo corto (min 32 caratteri)");
  return new TextEncoder().encode(s);
};

export type SessionUser = { id: string; name: string; role: Role };

export async function hashPassword(pw: string) { return bcrypt.hash(pw, 12); }
export async function verifyPassword(pw: string, hash: string) { return bcrypt.compare(pw, hash); }

/** Lunghezza minima decisa dal Super Admin in Impostazioni › Sicurezza. */
export async function passwordPolicy(pw: string): Promise<string | null> {
  const { security } = await getSettings();
  if (pw.length < security.minPasswordLength) return `La password deve avere almeno ${security.minPasswordLength} caratteri`;
  return null;
}

/** Accesso con sola password: trova l'utente attivo la cui password corrisponde. */
export async function findUserByPassword(pw: string, excludeId?: string) {
  const users = await db.user.findMany({ where: { active: true, ...(excludeId ? { id: { not: excludeId } } : {}) } });
  for (const u of users) if (await bcrypt.compare(pw, u.passwordHash)) return u;
  return null;
}

export async function createSession(u: SessionUser) {
  const token = await new SignJWT({ name: u.name, role: u.role })
    .setProtectedHeader({ alg: "HS256" }).setSubject(u.id).setIssuedAt().setExpirationTime("12h").sign(secret());
  cookies().set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 12 });
}

export function destroySession() { cookies().delete(COOKIE); }

export async function readToken(token?: string): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return { id: payload.sub!, name: String(payload.name), role: payload.role as Role };
  } catch { return null; }
}

/** Utente corrente, ricontrollato sul DB (utente disattivato = sessione non valida). */
export async function getUser(): Promise<SessionUser | null> {
  const u = await readToken(cookies().get(COOKIE)?.value);
  if (!u) return null;
  const row = await db.user.findUnique({ where: { id: u.id }, select: { active: true, role: true } });
  if (!row?.active) return null;
  return { ...u, role: row.role as Role };
}

export class AuthError extends Error { constructor(public status: 401 | 403) { super(status === 401 ? "Non autenticato" : "Permesso negato"); } }

export async function requirePermission(p: Permission): Promise<SessionUser> {
  const u = await getUser();
  if (!u) throw new AuthError(401);
  if (!can(u.role, p)) throw new AuthError(403);
  return u;
}

export const SESSION_COOKIE = COOKIE;
