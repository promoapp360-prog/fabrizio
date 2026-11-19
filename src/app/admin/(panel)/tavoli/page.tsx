import QRCode from "qrcode";
import { db } from "@/lib/db";
import { guard } from "@/components/admin/Guard";
import Tavoli from "./Tavoli";

export default async function P() {
  await guard("tables");
  const base = (process.env.PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const tables = await db.table.findMany({ orderBy: { number: "asc" }, include: { qrCodes: { where: { active: true } }, sessions: { where: { closedAt: null }, include: { orders: { where: { status: { not: "CANCELLED" } } } } },
    reservations: { where: { startsAt: { gte: start, lt: new Date(start.getTime() + 86400000) }, status: { in: ["CONFIRMED", "SEATED", "PENDING"] } }, include: { customer: true } } } });
  let menuQr = await db.qrCode.findFirst({ where: { kind: "MENU", active: true } });
  menuQr ??= await db.qrCode.create({ data: { kind: "MENU", token: "menu", target: "/menu" } });
  const data = await Promise.all(tables.map(async t => {
    const qr = t.qrCodes[0]; const url = qr ? `${base}/t/${qr.token}` : null;
    return { id: t.id, number: t.number, label: t.label, seats: t.seats, area: t.area, posX: t.posX, posY: t.posY, active: t.active, reservable: t.reservable,
      occupied: !!t.sessions.length, sessionId: t.sessions[0]?.id ?? null, orders: t.sessions[0]?.orders.length ?? 0,
      reservations: t.reservations.map(r => `${r.startsAt.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })} ${r.customer.name} (${r.people})`),
      url, svg: url ? await QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#0A0A08", light: "#FFFFFF" } }) : null };
  }));
  const menuSvg = await QRCode.toString(`${base}/menu`, { type: "svg", margin: 1 });
  return <Tavoli tables={data} menuSvg={menuSvg} menuUrl={`${base}/menu`} />;
}
