import { guard } from "@/components/admin/Guard";
import OrdersBoard from "@/components/admin/OrdersBoard";
import { can } from "@/lib/rbac";
import { getSettings } from "@/lib/settings";
export default async function Ordini() { const u = await guard("orders.manage"); const s = await getSettings(); return <OrdersBoard mode="floor" canPay={can(u.role, "orders.payments")} orderingOn={s.ordering.tableEnabled} />; }
