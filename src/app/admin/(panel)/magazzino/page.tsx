import { db } from "@/lib/db";
import { guard } from "@/components/admin/Guard";
import Magazzino from "./Magazzino";
export default async function P() { await guard("stock"); const products = await db.product.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }); return <Magazzino products={products} />; }
