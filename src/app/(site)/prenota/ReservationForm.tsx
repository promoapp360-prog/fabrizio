"use client";
import { useEffect, useState } from "react";

export default function ReservationForm({ maxParty, phone }: { maxParty: number; phone: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ date: today, time: "", people: 2, name: "", phone: "", email: "", notes: "", privacy: false, marketing: false });
  const [slots, setSlots] = useState<string[] | null>(null); const [closed, setClosed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const [done, setDone] = useState<{ code: string; status: string } | null>(null);
  const [idem] = useState(() => crypto.randomUUID());
  const set = (k: string, v: unknown) => setF(x => ({ ...x, [k]: v }));

  useEffect(() => { setSlots(null); fetch(`/api/reservations?date=${f.date}`).then(r => r.json()).then(j => { setSlots(j.slots ?? []); setClosed(j.closed ?? null); }).catch(() => setSlots([])); }, [f.date]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      const r = await fetch("/api/reservations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, idempotencyKey: idem }) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error ?? "Errore"); setDone(j);
    } catch (e) { setErr(e instanceof Error ? e.message : "Errore di connessione"); } finally { setBusy(false); }
  }

  if (done) return (<div role="status" className="card mt-10 text-center"><img src="/brand/fiamma-oro.webp" alt="" className="mx-auto h-16" />
    <h2 className="mt-4 text-2xl">{done.status === "CONFIRMED" ? "Prenotazione confermata" : "Richiesta ricevuta"}</h2>
    <p className="mt-2 text-cream/70">Codice: <b className="text-gold">{done.code}</b></p>
    {done.status !== "CONFIRMED" && <p className="mt-2 text-cream/70">Ti contatteremo per confermare.</p>}</div>);

  return (
    <form onSubmit={submit} className="mt-10 space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <label><span className="label">Data</span><input type="date" className="input" min={today} required value={f.date} onChange={e => set("date", e.target.value)} /></label>
        <label><span className="label">Persone</span><select className="input" value={f.people} onChange={e => set("people", +e.target.value)}>{Array.from({ length: maxParty }, (_, i) => i + 1).map(n => <option key={n}>{n}</option>)}</select></label>
      </div>
      <fieldset><legend className="label">Orario</legend>
        {closed ? <p className="text-cream/70">Chiuso: {closed}</p> : slots === null ? <p className="text-cream/50">Caricamento…</p> : !slots.length ? <p className="text-cream/70">Nessun turno disponibile in questa data.</p>
          : <div className="flex flex-wrap gap-2">{slots.map(t => <button type="button" key={t} aria-pressed={f.time === t} onClick={() => set("time", t)} className={`rounded-full px-4 py-2 text-sm ${f.time === t ? "bg-gold text-ink" : "border border-cream/20"}`}>{t}</button>)}</div>}
      </fieldset>
      <label className="block"><span className="label">Nome e cognome *</span><input className="input" required minLength={2} autoComplete="name" value={f.name} onChange={e => set("name", e.target.value)} /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label><span className="label">Telefono *</span><input className="input" type="tel" required autoComplete="tel" value={f.phone} onChange={e => set("phone", e.target.value)} /></label>
        <label><span className="label">Email</span><input className="input" type="email" autoComplete="email" value={f.email} onChange={e => set("email", e.target.value)} /></label>
      </div>
      <label className="block"><span className="label">Note e richieste (allergie, occasioni…)</span><textarea className="input" rows={3} maxLength={500} value={f.notes} onChange={e => set("notes", e.target.value)} /></label>
      <label className="flex gap-2 text-sm"><input type="checkbox" required checked={f.privacy} onChange={e => set("privacy", e.target.checked)} /> <span>Ho letto l&apos;<a href="/privacy" className="underline">informativa privacy</a> *</span></label>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={f.marketing} onChange={e => set("marketing", e.target.checked)} /> <span>Desidero ricevere novità e promozioni (facoltativo)</span></label>
      {err && <p role="alert" className="rounded-lg bg-red-900/50 p-3">{err}{phone && <> — oppure chiama <a href={`tel:${phone}`} className="underline">{phone}</a></>}</p>}
      <button className="btn-gold w-full" disabled={busy || !f.time}>{busy ? "Invio…" : "Prenota"}</button>
    </form>);
}
