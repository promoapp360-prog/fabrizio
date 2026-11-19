import { guard } from "@/components/admin/Guard";
import OrdersBoard from "@/components/admin/OrdersBoard";
export default async function Cucina() { await guard("kitchen"); return <OrdersBoard mode="kitchen" canPay={false} />; }
