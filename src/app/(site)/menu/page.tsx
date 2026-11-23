import Translated from "@/components/public/ServerTranslated";
import { loadMenu } from "@/lib/menu";
import { getSettings } from "@/lib/settings";
import MenuBrowser from "@/components/public/MenuBrowser";
import Link from "next/link";
import { createPageMetadata } from "@/lib/page-metadata";
export const generateMetadata = () => createPageMetadata({
  title: "Menù del ristorante a Matera",
  description: "Consulta il menù di Vecciarì a Matera: piatti, carni selezionate alla brace e proposte del ristorante. Contattaci per informazioni su ingredienti e allergeni.",
  path: "/menu",
});
export default async function Menu() {
  const [menu, s] = await Promise.all([loadMenu(), getSettings()]);
  return <Translated>{<div className="mx-auto max-w-3xl px-4 py-10"><h1 className="text-5xl">Menu</h1>{(s.ordering.tableEnabled || s.ordering.takeawayEnabled) && <Link href="/ordina" className="btn-gold my-5">Ordina al tavolo o da asporto</Link>}<MenuBrowser menu={menu} cooking={s.cooking} /></div>}</Translated>;
}
