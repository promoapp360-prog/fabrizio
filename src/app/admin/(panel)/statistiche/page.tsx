import { db } from "@/lib/db";
import { guard } from "@/components/admin/Guard";
import { formatEUR } from "@/lib/pricing";

function Bars({ data, fmt = (n: number) => String(n) }: { data: { label: string; value: number }[]; fmt?: (n: number) => string }) {
  const max = Math.max(1, ...data.map(d => d.value));
  return <ul className="mt-3 space-y-1.5">{data.map(d => <li key={d.label} className="grid grid-cols-[110px_1fr_80px] items-center gap-2 text-xs"><span className="truncate text-cream/70">{d.label}</span>
    <span className="h-3 rounded bg-cream/5"><span className="block h-3 rounded bg-gold" style={{ width: `${(d.value / max) * 100}%` }} /></span><span className="text-right">{fmt(d.value)}</span></li>)}
    {!data.length && <li className="text-xs text-cream/40">Nessun dato nel periodo</li>}</ul>;
}

export default async function Stats({ searchParams: pendingSearchParams }: { searchParams: Promise<{ days?: string }> }) {
  const searchParams = await pendingSearchParams;
  await guard("stats");
  const days = Math.min(365, Number(searchParams.days) || 30); const from = new Date(Date.now() - days * 86400000);
  const [orders, items, res, payments, tables, products] = await Promise.all([
    db.order.findMany({ where: { createdAt: { gte: from } }, select: { createdAt: true, status: true, channel: true, estimatedCents: true, finalCents: true, sessionId: true } }),
    db.orderItem.findMany({ where: { order: { createdAt: { gte: from }, status: { not: "CANCELLED" } } }, select: { nameSnapshot: true, quantity: true, lineEstCents: true, lineFinalCents: true, product: { select: { category: { select: { name: true } } } } } }),
    db.reservation.findMany({ where: { startsAt: { gte: from } }, select: { startsAt: true, people: true, status: true } }),
    db.payment.findMany({ where: { createdAt: { gte: from }, status: "PAID" }, select: { amountCents: true } }),
    db.table.count({ where: { active: true } }),
    db.product.findMany({ where: { active: true }, select: { name: true, available: true } }),
  ]);
  const valid = orders.filter(o => o.status !== "CANCELLED");
  const byDay = new Map<string, number>(); valid.forEach(o => { const k = o.createdAt.toISOString().slice(5, 10); byDay.set(k, (byDay.get(k) ?? 0) + 1); });
  const byHour = new Map<string, number>(); valid.forEach(o => { const k = `${String(o.createdAt.getHours()).padStart(2, "0")}:00`; byHour.set(k, (byHour.get(k) ?? 0) + 1); });
  const prod = new Map<string, number>(); items.forEach(i => prod.set(i.nameSnapshot, (prod.get(i.nameSnapshot) ?? 0) + i.quantity));
  const cat = new Map<string, number>(); items.forEach(i => { const k = i.product.category.name; cat.set(k, (cat.get(k) ?? 0) + (i.lineFinalCents ?? i.lineEstCents)); });
  const covers = res.filter(r => ["CONFIRMED", "SEATED", "COMPLETED"].includes(r.status)).reduce((s, r) => s + r.people, 0);
  const sessions = new Set(valid.filter(o => o.sessionId).map(o => o.sessionId)).size;
  const registered = valid.reduce((s, o) => s + (o.finalCents ?? o.estimatedCents), 0);
  const cashed = payments.reduce((s, p) => s + p.amountCents, 0);
  const top = [...prod].sort((a, b) => b[1] - a[1]); const ordered = new Set(prod.keys());
  const K = ({ l, v, h }: { l: string; v: string | number; h?: string }) => <div className="card"><p className="label">{l}</p><p className="font-display text-2xl text-gold">{v}</p>{h && <p className="text-xs text-cream/50">{h}</p>}</div>;
  return (<div>
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl">Statistiche · ultimi {days} giorni</h1>
      <div className="flex gap-2 text-sm">{[7, 30, 90, 365].map(d => <a key={d} href={`?days=${d}`} className={`rounded-full px-3 py-1 ${d === days ? "bg-gold text-ink" : "border border-cream/20"}`}>{d}g</a>)}</div></div>
    <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
      <K l="Ordini" v={valid.length} h={`${orders.length - valid.length} annullati`} /><K l="Valore ordini registrati" v={formatEUR(registered)} h="Non equivale all'incassato" />
      <K l="Incassato registrato" v={formatEUR(cashed)} h="Pagamenti segnati come pagati" /><K l="Prenotazioni / coperti" v={`${res.length} / ${covers}`} /><K l="Occupazione tavoli" v={`${sessions} sessioni`} h={`${tables} tavoli attivi`} />
    </div>
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <section className="card"><h2>Andamento ordini</h2><Bars data={[...byDay].sort().map(([label, value]) => ({ label, value }))} /></section>
      <section className="card"><h2>Ordini per fascia oraria</h2><Bars data={[...byHour].sort().map(([label, value]) => ({ label, value }))} /></section>
      <section className="card"><h2>Piatti più richiesti</h2><Bars data={top.slice(0, 10).map(([label, value]) => ({ label, value }))} /></section>
      <section className="card"><h2>Valore per categoria</h2><Bars data={[...cat].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }))} fmt={formatEUR} /></section>
      <section className="card lg:col-span-2"><h2>Esauriti o mai ordinati nel periodo</h2><p className="mt-2 text-sm text-cream/70">{products.filter(p => !p.available || !ordered.has(p.name)).map(p => `${p.name}${!p.available ? " (esaurito)" : ""}`).join(" · ") || "—"}</p></section>
    </div>
    <div className="mt-6 flex flex-wrap gap-3">{[["orders", "Ordini"], ["products", "Prodotti"], ["reservations", "Prenotazioni"]].map(([k, l]) => <a key={k} className="btn-ghost" href={`/api/admin/export?report=${k}&from=${from.toISOString()}`}>Esporta {l} CSV</a>)}</div>
  </div>);
}
