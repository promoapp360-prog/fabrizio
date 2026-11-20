import Translated from "@/components/public/ServerTranslated";
import LanguageSwitcher from "@/components/public/LanguageSwitcher";
import { db } from "@/lib/db";
import { loadMenu } from "@/lib/menu";
import { getSettings } from "@/lib/settings";
import TableOrder from "./TableOrder";

export const metadata = { title: "Ordina dal tavolo", robots: { index: false } };

// Pagina aperta dal QR: il tavolo è identificato dal token segreto, non da un numero modificabile.
export default async function TablePage({ params: pendingParams }: { params: Promise<{ token: string }> }) {
  const params = await pendingParams;
  const qr = await db.qrCode.findUnique({ where: { token: params.token }, include: { table: true } });
  const s = await getSettings();
  if (!qr?.active) return <Translated>{<main className="flex min-h-screen items-center justify-center p-6 text-center"><div className="absolute right-4 top-4"><LanguageSwitcher /></div><div><img src={s.brand.mark} alt="" className="mx-auto h-20" /><h1 className="mt-6 text-2xl">QR non valido</h1><p className="mt-2 text-cream/60">Questo codice non è più attivo. Chiedi assistenza al personale.</p></div></main>}</Translated>;
  const menu = await loadMenu("TABLE");
  const isTable = qr.kind === "TABLE" && !!qr.table;
  return <Translated>{<TableOrder token={params.token} tableLabel={isTable ? (qr.table!.label || `Tavolo ${qr.table!.number}`) : null} menu={menu} cooking={s.cooking}
    tableNumber={isTable ? qr.table!.number : undefined} orderingOn={isTable && s.ordering.tableEnabled} logo={s.brand.logo} whatsapp={s.contacts.whatsapp} />}</Translated>;
}
