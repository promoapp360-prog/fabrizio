import { db } from "@/lib/db";
import { guard } from "@/components/admin/Guard";
import Prenotazioni from "./Prenotazioni";
export default async function P() { await guard("reservations"); const tables = await db.table.findMany({ where: { active: true }, orderBy: { number: "asc" }, select: { id: true, number: true, seats: true } }); return <Prenotazioni tables={tables} />; }
