import { loadMenu } from "@/lib/menu";
import { getSettings } from "@/lib/settings";
import OnlineOrder from "./OnlineOrder";
export const metadata = { title: "Ordina online" };
export default async function Ordina() {
  const s = await getSettings();
  const o = s.ordering;
  if (!o.tableEnabled && !o.takeawayEnabled && !o.deliveryEnabled) return <div className="mx-auto max-w-xl px-4 py-24 text-center"><h1 className="text-4xl">Ordini</h1><p className="mt-4 text-cream/70">Gli ordini sono momentaneamente sospesi.</p></div>;
  const menu = await loadMenu();
  return <OnlineOrder menu={menu} cooking={s.cooking} table={o.tableEnabled} takeaway={o.takeawayEnabled} delivery={o.deliveryEnabled} prepMinutes={o.prepMinutes} feeDelivery={o.deliveryFeeCents} minDelivery={o.deliveryMinCents} zones={o.deliveryZones} />;
}
