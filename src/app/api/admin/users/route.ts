import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { handle, HttpError } from "@/lib/api";
import { requirePermission, hashPassword, passwordPolicy, findUserByPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";

const pub = { id: true, name: true, role: true, active: true, lastLoginAt: true } as const;
export const GET = handle(async () => { await requirePermission("users"); return NextResponse.json(await db.user.findMany({ select: pub, orderBy: { name: "asc" } })); });

// Crea o modifica un membro dello staff. Nessuna email: l'utente è riconosciuto dalla password, che deve essere unica.
export const POST = handle(async (req: Request) => {
  const u = await requirePermission("users");
  const d = z.object({ id: z.string().optional(), name: z.string().trim().min(1).max(60), role: z.enum(["SUPER_ADMIN", "MANAGER", "WAITER", "KITCHEN"]), active: z.boolean().default(true), password: z.string().max(200).optional() }).parse(await req.json());
  if (!d.id && !d.password) throw new HttpError(400, "Password obbligatoria");
  if (d.password) {
    const e = await passwordPolicy(d.password); if (e) throw new HttpError(400, e);
    if (await findUserByPassword(d.password, d.id)) throw new HttpError(409, "Password già in uso da un altro membro dello staff, scegline un'altra");
  }
  if (d.id === u.id && (!d.active || d.role !== "SUPER_ADMIN")) throw new HttpError(400, "Non puoi declassare o disattivare il tuo account");
  const data = { name: d.name, role: d.role, active: d.active, ...(d.password ? { passwordHash: await hashPassword(d.password) } : {}) };
  const row = d.id ? await db.user.update({ where: { id: d.id }, data, select: pub })
    : await db.user.create({ data: { ...data, passwordHash: data.passwordHash! }, select: pub });
  await audit(u.id, d.id ? (d.password ? "user_update_password" : "user_update") : "user_create", "User", row.id, { role: d.role, active: d.active });
  return NextResponse.json(row);
});
