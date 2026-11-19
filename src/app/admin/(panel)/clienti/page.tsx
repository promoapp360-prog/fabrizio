import { guard } from "@/components/admin/Guard";
import Clienti from "./Clienti";
export default async function P() { await guard("customers"); return <Clienti />; }
