import { guard } from "@/components/admin/Guard";
import MenuAdmin from "./MenuAdmin";
export default async function P() { await guard("menu"); return <MenuAdmin />; }
