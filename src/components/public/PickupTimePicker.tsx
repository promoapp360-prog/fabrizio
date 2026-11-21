"use client";
import { useEffect, useRef, useState } from "react";
import Translated from "./Translated";
import { romeDay } from "@/lib/pickup-times";
type Availability = { day: string; today: string; lastDay: string; slots: { time: string; at: string }[] };
export default function PickupTimePicker({ value, onChange, delivery = false }: {
  value: string; onChange: (at: string) => void; delivery?: boolean;
}) {
  const [day, setDay] = useState(() => value && Number.isFinite(Date.parse(value)) ? romeDay(new Date(value)) : "");
  const [data, setData] = useState<Availability | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const current = useRef({ value, onChange });
  current.current = { value, onChange };
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function refresh() {
      try {
        const res = await fetch(`/api/pickup-slots${day ? `?date=${encodeURIComponent(day)}` : ""}`, { cache: "no-store", signal: controller.signal });
        if (!res.ok) throw new Error();
        const result: Availability = await res.json();
        if (!active) return;
        setData(result); setFailed(false);
        if (!day) setDay(result.day);
        if (current.current.value && !result.slots.some(slot => slot.at === current.current.value)) current.current.onChange("");
      } catch { if (active) { setFailed(true); setData(null); current.current.onChange(""); } }
      finally { if (active) setLoading(false); }
    }
    setLoading(true); void refresh();
    const interval = setInterval(refresh, 30000);
    return () => { active = false; controller.abort(); clearInterval(interval); };
  }, [day]);
  return <Translated><fieldset className="space-y-3 rounded-xl border border-cream/15 p-3">
    <legend className="px-1 font-display uppercase">{delivery ? "Orario di consegna *" : "Orario di ritiro *"}</legend>
    <p className="text-sm text-cream/70">Scegli il giorno, poi uno degli orari disponibili. Tutti gli orari sono di Matera.</p>
    <label className="block"><span className="label">Data</span>
      <input className="input" type="date" required min={data?.today} max={data?.lastDay} value={day}
        onChange={e => { setDay(e.target.value); setData(null); setLoading(true); onChange(""); }} />
    </label>
    <label className="block"><span className="label">Orario</span>
      <select className="input" aria-label="Orario" required value={value} disabled={loading || !data?.slots.length} onChange={e => onChange(e.target.value)}>
        <option value="">{loading ? "Attendi…" : "Scegli l’orario di ritiro."}</option>
        {data?.slots.map(slot => <option key={slot.at} value={slot.at}>{slot.time}</option>)}
      </select>
    </label>
    <p className="text-xs text-cream/60"><span>Pranzo 12:00–15:00 · Cena 19:00–23:00</span><br /><span>Lunedì chiuso</span></p>
    {!loading && !failed && !data?.slots.length && <p role="status" className="text-sm text-gold">Nessun orario disponibile per questo giorno. Scegli un’altra data.</p>}
    {failed && <p role="alert" className="text-sm text-red-300">Aggiornamento non disponibile. Riproveremo automaticamente.</p>}
    {value && data?.slots.some(slot => slot.at === value) && <p className="text-sm text-gold"><span>{delivery ? "Orario di consegna *" : "Orario di ritiro *"}</span><br /><span translate="no">{data.day.split("-").reverse().join("/")} · {data.slots.find(slot => slot.at === value)?.time}</span> <span>(ora italiana)</span></p>}
  </fieldset></Translated>;
}
