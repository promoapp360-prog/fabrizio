"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/components/admin/ResourceManager";
/* eslint-disable @typescript-eslint/no-explicit-any */
const ST: Record<string, string> = { PENDING: "In attesa", CONFIRMED: "Confermata", CANCELLED: "Annullata", SEATED: "Al tavolo", NO_SHOW: "No show", COMPLETED: "Conclusa", WAITLIST: "Lista d'attesa" };
const day = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
export default function Prenotazioni({ tables }: { tables: { id: string; number: number; seats: number }[] }) {
  const [from, setFrom] = useState(day(new Date())); const [mode, setMode] = useState<"day" | "week">("day"); const [list, setList] = useState<any[]>([]);
  const [form, setForm] = useState<any | null>(null); const [err, setErr] = useState("");
  const to = new Date(from.getTime() + (mode === "day" ? 1 : 7) * 86400000);
  const load = useCallback(() => api(`/api/admin/reservations?from=${from.toISOString()}&to=${to.toISOString()}`).then(setList).catch(e => setErr(e.message)), [from, mode]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);
  const upd = async (id: string, d: any) => { try { await api(`/api/admin/reservations/${id}`, "PATCH", d); load(); } catch (e: any) { alert(e.message); } };
  const shift = (n: number) => setFrom(new Date(from.getTime() + n * (mode === "day" ? 1 : 7) * 86400000));
  const days = Array.from({ length: mode === "day" ? 1 : 7 }, (_, i) => new Date(from.getTime() + i * 86400000));
  async function save(e: React.FormEvent) { e.preventDefault(); try { await api("/api/admin/reservations", "POST", { ...form, people: Number(form.people), startsAt: new Date(form.startsAt).toISOString(), tableId: form.tableId || undefined }); setForm(null); load(); } catch (e: any) { setErr(e.message); } }

  return (<div>
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl">Prenotazioni</h1>
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-ghost !px-3 !py-2" onClick={() => shift(-1)} aria-label="Precedente">‹</button>
        <input type="date" className="input !w-40" value={from.toISOString().slice(0, 10)} onChange={e => setFrom(day(new Date(e.target.value)))} />
        <button className="btn-ghost !px-3 !py-2" onClick={() => shift(1)} aria-label="Successivo">›</button>
        <select className="input !w-32" value={mode} onChange={e => setMode(e.target.value as "day")}><option value="day">Giorno</option><option value="week">Settimana</option></select>
        <button className="btn-gold !py-2" onClick={() => setForm({ name: "", phone: "", people: 2, startsAt: "", source: "phone", status: "CONFIRMED" })}>+ Telefonica / walk-in</button>
      </div></div>
    {err && <p className="mt-3 text-sm text-red-400">{err}</p>}
    <div className={`mt-6 grid gap-4 ${mode === "week" ? "lg:grid-cols-7" : ""}`}>{days.map(d => {
      const items = list.filter(r => day(new Date(r.startsAt)).getTime() === d.getTime());
      return <section key={d.toISOString()} className="card !p-3"><h2 className="text-sm">{d.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })} · {items.filter(r => !["CANCELLED", "NO_SHOW"].includes(r.status)).reduce((s, r) => s + r.people, 0)} coperti</h2>
        <ul className="mt-2 space-y-2">{items.map(r => (
          <li key={r.id} className={`rounded-lg border p-2 text-sm ${r.status === "PENDING" ? "border-gold" : "border-cream/10"} ${["CANCELLED", "NO_SHOW"].includes(r.status) ? "opacity-50" : ""}`}>
            <p><b>{new Date(r.startsAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</b> · {r.customer.name} · {r.people} pax</p>
            <p className="text-xs text-cream/60">{r.customer.phone} · {ST[r.status]} · {r.source} · {r.code}</p>
            {r.notes && <p className="text-xs italic text-gold">{r.notes}</p>}
            {mode === "day" && <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <select className="input !w-auto !py-1 text-xs" value={r.tableId ?? ""} onChange={e => upd(r.id, { tableId: e.target.value || null })} aria-label="Tavolo"><option value="">Tavolo…</option>{tables.filter(t => t.seats >= r.people).map(t => <option key={t.id} value={t.id}>T{t.number} ({t.seats})</option>)}</select>
              {r.status === "PENDING" && <button className="text-gold underline" onClick={() => upd(r.id, { status: "CONFIRMED" })}>Conferma</button>}
              {["CONFIRMED", "PENDING", "WAITLIST"].includes(r.status) && <button className="underline" onClick={() => upd(r.id, { status: "SEATED" })}>Arrivati</button>}
              {r.status === "CONFIRMED" && <button className="underline" onClick={() => upd(r.id, { status: "NO_SHOW" })}>No show</button>}
              {!["CANCELLED", "COMPLETED"].includes(r.status) && <button className="text-red-400 underline" onClick={() => confirm("Annullare?") && upd(r.id, { status: "CANCELLED" })}>Annulla</button>}
            </div>}
          </li>))}{!items.length && <li className="text-xs text-cream/40">Nessuna</li>}</ul></section>;
    })}</div>
    {form && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setForm(null)}><form onSubmit={save} onClick={e => e.stopPropagation()} className="card w-full max-w-md space-y-3">
      <h2 className="text-xl">Nuova prenotazione manuale</h2>
      <input className="input" required placeholder="Nome" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
      <input className="input" required placeholder="Telefono" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
      <div className="grid grid-cols-2 gap-2"><input className="input" type="datetime-local" required value={form.startsAt} onChange={e => setForm({ ...form, startsAt: e.target.value })} /><input className="input" type="number" min={1} value={form.people} onChange={e => setForm({ ...form, people: e.target.value })} /></div>
      <div className="grid grid-cols-3 gap-2"><select className="input" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}><option value="phone">Telefono</option><option value="walk-in">Walk-in</option></select>
        <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="CONFIRMED">Confermata</option><option value="WAITLIST">Lista d&apos;attesa</option><option value="SEATED">Al tavolo</option></select>
        <select className="input" value={form.tableId ?? ""} onChange={e => setForm({ ...form, tableId: e.target.value })}><option value="">Tavolo</option>{tables.map(t => <option key={t.id} value={t.id}>T{t.number}</option>)}</select></div>
      <textarea className="input" placeholder="Note" value={form.notes ?? ""} onChange={e => setForm({ ...form, notes: e.target.value })} />
      <p className="text-xs text-cream/50">Le prenotazioni manuali possono superare la capienza online: verificare la sala.</p>
      <button className="btn-gold w-full">Salva</button></form></div>}
  </div>);
}
