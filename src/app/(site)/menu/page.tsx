import { loadMenu } from "@/lib/menu";
import { getSettings } from "@/lib/settings";
import MenuBrowser from "@/components/public/MenuBrowser";
import Link from "next/link";
export const metadata = { title: "Menu" };
export default async function Menu() {
  const [menu, s] = await Promise.all([loadMenu(), getSettings()]);
  return <div className="mx-auto max-w-3xl px-4 py-10"><h1 className="text-5xl">Menu</h1>{(s.ordering.tableEnabled || s.ordering.takeawayEnabled) && <Link href="/ordina" className="btn-gold my-5">Ordina al tavolo o da asporto</Link>}<MenuBrowser menu={menu} cooking={s.cooking} /></div>;
}
