import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { handle, HttpError } from "@/lib/api";
import { requirePermission, hashPassword, passwordPolicy } from "@/lib/auth";
import { audit } from "@/lib/audit";

const pub = { id: true, email: true, name: true, role: true, active: true, lastLoginAt: true } as const;
export const GET = handle(async () => { await requirePermission("users"); return NextResponse.json(await db.user.findMany({ select: pub, orderBy: { name: "asc" } })); });
export const POST = handle(async (req: Request) => {
  const u = await requirePermission("users");
  const d = z.object({ id: z.string().optional(), email: z.string().email(), name: z.string().min(1), role: z.enum(["SUPER_ADMIN", "MANAGER", "WAITER", "KITCHEN"]), active: z.boolean().default(true), password: z.string().optional() }).parse(await req.json());
  if (d.password) { const e = passwordPolicy(d.password); if (e) throw new HttpError(400, e); }
  if (d.id === u.id && (!d.active || d.role !== "SUPER_ADMIN")) throw new HttpError(400, "Non puoi declassare o disattivare il tuo account");
  const data = { email: d.email.toLowerCase(), name: d.name, role: d.role, active: d.active, ...(d.password ? { passwordHash: await hashPassword(d.password) } : {}) };
  const row = d.id ? await db.user.update({ where: { id: d.id }, data, select: pub })
    : await db.user.create({ data: { ...data, passwordHash: data.passwordHash ?? (() => { throw new HttpError(400, "Password obbligatoria"); })() }, select: pub });
  await audit(u.id, d.id ? "user_update" : "user_create", "User", row.id, { role: d.role, active: d.active });
  return NextResponse.json(row);
});
