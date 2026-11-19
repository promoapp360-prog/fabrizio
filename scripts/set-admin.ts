/**
 * Imposta (o recupera) la password del Super Admin.
 * Uso: npm run admin:set -- <password>
 * Ignora la lunghezza minima delle Impostazioni: serve anche come recupero d'accesso.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const db = new PrismaClient();
async function main() {
  const pw = process.argv[2];
  if (!pw) throw new Error("Uso: npm run admin:set -- <password>");
  const others = await db.user.findMany({ where: { role: { not: "SUPER_ADMIN" } } });
  for (const u of others) if (await bcrypt.compare(pw, u.passwordHash)) throw new Error("Password già usata da un membro dello staff: scegline un'altra");
  const passwordHash = await bcrypt.hash(pw, 12);
  const admin = await db.user.findFirst({ where: { role: "SUPER_ADMIN" }, orderBy: { createdAt: "asc" } });
  if (admin) await db.user.update({ where: { id: admin.id }, data: { passwordHash, active: true } });
  else await db.user.create({ data: { name: "Amministratore", role: "SUPER_ADMIN", passwordHash } });
  console.log("Admin aggiornato ✓");
}
main().catch(e => { console.error(e.message); process.exit(1); }).finally(() => db.$disconnect());
