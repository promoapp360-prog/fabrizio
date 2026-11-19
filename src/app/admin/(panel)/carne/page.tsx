import { guard } from "@/components/admin/Guard";
import MeatAdmin from "./MeatAdmin";
export default async function P() { await guard("meat"); return <MeatAdmin />; }
