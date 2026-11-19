import { guard } from "@/components/admin/Guard";
import Utenti from "./Utenti";
export default async function P() { await guard("users"); return <Utenti />; }
