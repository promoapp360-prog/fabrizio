import { loadMenu } from "@/lib/menu";
import { getSettings } from "@/lib/settings";
import MenuBrowser from "@/components/public/MenuBrowser";
export const metadata = { title: "Menu" };
export default async function Menu() {
  const [menu, s] = await Promise.all([loadMenu(), getSettings()]);
  return <div className="mx-auto max-w-3xl px-4 py-10"><h1 className="text-5xl">Menu</h1><MenuBrowser menu={menu} cooking={s.cooking} /></div>;
}
