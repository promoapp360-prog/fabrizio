import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { can, type Permission } from "@/lib/rbac";
import Nav from "@/components/admin/Nav";

export const metadata = { title: "Gestionale", robots: { index: false } };
const ITEMS: [string, string, Permission][] = [
  ["/admin", "Dashboard", "dashboard"], ["/admin/ordini", "Ordini", "orders.manage"], ["/admin/cucina", "Cucina", "kitchen"],
  ["/admin/prenotazioni", "Prenotazioni", "reservations"], ["/admin/tavoli", "Sala & QR", "tables"], ["/admin/menu", "Gestione Menu", "menu"],
  ["/admin/carne", "Mondo carne", "meat"], ["/admin/contenuti", "Contenuti sito", "content"], ["/admin/promozioni", "Promozioni", "promotions"],
  ["/admin/clienti", "Clienti", "customers"], ["/admin/magazzino", "Magazzino", "stock"], ["/admin/statistiche", "Statistiche", "stats"],
  ["/admin/impostazioni", "Impostazioni", "settings"], ["/admin/utenti", "Personale", "users"], ["/admin/log", "Registro attività", "audit"],
];
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const u = await getUser();
  if (!u) redirect("/admin/login");
  const items = ITEMS.filter(([, , p]) => can(u.role, p)).map(([href, label]) => ({ href, label }));
  return <div className="min-h-screen bg-ink"><Nav items={items} user={u} /><main className="p-4 pt-16 lg:ml-60 lg:p-8">{children}</main></div>;
}
