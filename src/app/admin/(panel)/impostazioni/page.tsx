import { guard } from "@/components/admin/Guard";
import { getSettings, integrationStatus } from "@/lib/settings";
import Impostazioni from "./Impostazioni";
export default async function P() { await guard("settings"); return <Impostazioni settings={await getSettings()} integrations={integrationStatus()} />; }
