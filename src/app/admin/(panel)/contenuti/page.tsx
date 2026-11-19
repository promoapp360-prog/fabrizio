import { guard } from "@/components/admin/Guard";
import { storageConfigured } from "@/lib/storage";
import Contenuti from "./Contenuti";
export default async function P() { await guard("content"); return <Contenuti storage={storageConfigured()} />; }
