import { loadMenu } from "@/lib/menu";
import { getSettings } from "@/lib/settings";
import OnlineOrder from "./OnlineOrder";
export const metadata = { title: "Ordina online" };
export default async function Ordina() {
  const s = await getSettings();
  const o = s.ordering;
  if (!o.takeawayEnabled && !o.deliveryEnabled) return <div className="mx-auto max-w-xl px-4 py-24 text-center"><h1 className="text-4xl">Ordini online</h1><p className="mt-4 text-cream/70">Il servizio di asporto e consegna non è attivo al momento.</p></div>;
  const menu = await loadMenu(o.takeawayEnabled ? "TAKEAWAY" : "DELIVERY");
  return <OnlineOrder menu={menu} cooking={s.cooking} takeaway={o.takeawayEnabled} delivery={o.deliveryEnabled} stripe={o.stripeEnabled && !!process.env.STRIPE_SECRET_KEY} prepMinutes={o.prepMinutes} minDelivery={o.deliveryMinCents} feeDelivery={o.deliveryFeeCents} zones={o.deliveryZones} />;
}
