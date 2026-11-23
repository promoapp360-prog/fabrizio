import Translated from "@/components/public/ServerTranslated";
import { loadMenu } from "@/lib/menu";
import { getSettings } from "@/lib/settings";
import OnlineOrder from "./OnlineOrder";
import { createPageMetadata } from "@/lib/page-metadata";
export const generateMetadata = () => createPageMetadata({
  title: "Ordina online a Matera",
  description: "Consulta il menù e verifica le modalità di ordine disponibili da Vecciarì, ristorante in Via XX Settembre 14 a Matera.",
  path: "/ordina",
});
export default async function Ordina() {
  const s = await getSettings();
  const o = s.ordering;
  if (!o.tableEnabled && !o.takeawayEnabled && !o.deliveryEnabled) return <Translated>{<div className="mx-auto max-w-xl px-4 py-24 text-center"><h1 className="text-4xl">Ordini</h1><p className="mt-4 text-cream/70">Gli ordini sono momentaneamente sospesi.</p></div>}</Translated>;
  const menu = await loadMenu();
  return <Translated>{<OnlineOrder menu={menu} cooking={s.cooking} table={o.tableEnabled} takeaway={o.takeawayEnabled} delivery={o.deliveryEnabled} prepMinutes={o.prepMinutes} feeDelivery={o.deliveryFeeCents} minDelivery={o.deliveryMinCents} zones={o.deliveryZones} whatsapp={s.contacts.whatsapp} />}</Translated>;
}
