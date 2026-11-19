import Link from "next/link";
import { db } from "@/lib/db";
import { guard } from "@/components/admin/Guard";
import { formatEUR } from "@/lib/pricing";
import { getSettings } from "@/lib/settings";

export default async function Dashboard({ searchParams: pendingSearchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const searchParams = await pendingSearchParams;
  await guard("dashboard");
  const start = new Date(); start.setHours(0, 0, 0, 0); const end = new Date(start.getTime() + 86400000);
  const [res, tables, openSessions, ordersToday, preparing, received, top, paid, lowStock, unconfirmedWeights, s] = await Promise.all([
    db.reservation.findMany({ where: { startsAt: { gte: start, lt: end }, status: { in: ["PENDING", "CONFIRMED", "SEATED"] } }, include: { customer: true, table: true }, orderBy: { startsAt: "asc" } }),
    db.table.count({ where: { active: true } }),
    db.tableSession.count({ where: { closedAt: null } }),
    db.order.findMany({ where: { createdAt: { gte: start, lt: end }, status: { not: "CANCELLED" } }, select: { estimatedCents: true, finalCents: true } }),
    db.order.count({ where: { status: "PREPARING" } }),
    db.order.count({ where: { status: "RECEIVED" } }),
    db.orderItem.groupBy({ by: ["nameSnapshot"], where: { order: { createdAt: { gte: start, lt: end }, status: { not: "CANCELLED" } } }, _sum: { quantity: true }, orderBy: { _sum: { quantity: "desc" } }, take: 5 }),
    db.payment.aggregate({ where: { createdAt: { gte: start, lt: end }, status: "PAID" }, _sum: { amountCents: true } }),
    db.$queryRaw<{ name: string }[]>`SELECT name FROM "StockItem" WHERE quantity <= "minLevel" LIMIT 10`,
    db.order.count({ where: { hasWeighted: true, finalCents: null, status: { notIn: ["CANCELLED"] } } }),
    getSettings(),
  ]);
  const covers = res.reduce((a, r) => a + r.people, 0);
  const registered = ordersToday.reduce((a, o) => a + (o.finalCents ?? o.estimatedCents), 0);
  const alerts = [
    !s.ordering.tableEnabled && "Ordini dal tavolo SOSPESI",
    received && `${received} ordini in attesa di conferma`,
    unconfirmedWeights && `${unconfirmedWeights} ordini con peso da confermare`,
    ...lowStock.map(x => `Scorta bassa: ${x.name}`),
    res.some(r => r.status === "PENDING") && `${res.filter(r => r.status === "PENDING").length} prenotazioni da confermare`,
  ].filter(Boolean) as string[];
  const K = ({ l, v, h }: { l: string; v: string | number; h?: string }) => <div className="card"><p className="label">{l}</p><p className="font-display text-3xl text-gold">{v}</p>{h && <p className="text-xs text-cream/50">{h}</p>}</div>;
  return (<div>
    {searchParams.denied && <p className="mb-4 rounded bg-red-900/50 p-3 text-sm">Non hai i permessi per quella sezione.</p>}
    <h1 className="text-3xl">Oggi · {start.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}</h1>
    <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <K l="Prenotazioni" v={res.length} /><K l="Coperti previsti" v={covers} /><K l="Tavoli occupati" v={`${openSessions}/${tables}`} /><K l="Ordini in preparazione" v={preparing} />
      <K l="Ordini ricevuti oggi" v={ordersToday.length} /><K l="Vendite registrate" v={formatEUR(registered)} h="Valore ordini (non incassato)" /><K l="Incassato registrato" v={formatEUR(paid._sum.amountCents ?? 0)} h="Pagamenti segnati come pagati" /><K l="Da confermare" v={received} />
    </div>
    <div className="mt-8 grid gap-6 lg:grid-cols-3">
      <section className="card lg:col-span-2"><h2 className="text-lg">Prenotazioni di oggi</h2>
        <ul className="mt-3 divide-y divide-cream/10 text-sm">{res.map(r => <li key={r.id} className="flex justify-between py-2"><span>{r.startsAt.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })} · {r.customer.name} · {r.people} pax</span><span className="text-cream/60">{r.table ? `T${r.table.number}` : "—"} · {r.status}</span></li>)}
          {!res.length && <li className="py-2 text-cream/50">Nessuna</li>}</ul></section>
      <section className="space-y-6">
        <div className="card"><h2 className="text-lg">Avvisi</h2><ul className="mt-3 space-y-1 text-sm">{alerts.length ? alerts.map(a => <li key={a} className="text-gold">• {a}</li>) : <li className="text-cream/50">Nessun avviso</li>}</ul></div>
        <div className="card"><h2 className="text-lg">Più ordinati oggi</h2><ol className="mt-3 list-decimal pl-5 text-sm">{top.map(t => <li key={t.nameSnapshot}>{t.nameSnapshot} ({t._sum.quantity})</li>)}</ol></div>
      </section>
    </div>
    <div className="mt-8 flex flex-wrap gap-3">{[["/admin/ordini", "Ordini"], ["/admin/cucina", "Cucina"], ["/admin/prenotazioni", "Nuova prenotazione"], ["/admin/menu", "Menu"], ["/admin/tavoli", "Sala"]].map(([h, l]) => <Link key={h} href={h} className="btn-ghost">{l}</Link>)}</div>
  </div>);
}
