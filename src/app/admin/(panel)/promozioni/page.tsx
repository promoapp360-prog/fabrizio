import { guard } from "@/components/admin/Guard";
import Promo from "./Promo";
export default async function P() { await guard("promotions"); return <Promo />; }
