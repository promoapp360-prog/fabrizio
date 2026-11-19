"use client";
import { useState } from "react";
import ResourceManager, { api } from "@/components/admin/ResourceManager";
/* eslint-disable @typescript-eslint/no-explicit-any */
const rgbToHex = (s: string) => "#" + s.split(" ").map(n => Number(n).toString(16).padStart(2, "0")).join("");
const hexToRgb = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(" ");

export default function Impostazioni({ settings, integrations }: { settings: any; integrations: any[] }) {
  const [tab, setTab] = useState("generale"); const [s, setS] = useState(settings); const [msg, setMsg] = useState("");
  const save = async (key: string) => { try { await api("/api/admin/settings", "PUT", { key, value: s[key] }); setMsg("Salvato ✓"); setTimeout(() => setMsg(""), 2000); } catch (e: any) { setMsg(e.message); } };
  const set = (k: string, f: string, v: any) => setS({ ...s, [k]: { ...s[k], [f]: v } });
  const T = ({ k, f, l, type = "text" }: { k: string; f: string; l: string; type?: string }) => <label className="block"><span className="label">{l}</span>
    {type === "bool" ? <input type="checkbox" className="h-5 w-5" checked={!!s[k][f]} onChange={e => set(k, f, e.target.checked)} />
      : type === "textarea" ? <textarea className="input" rows={3} value={s[k][f] ?? ""} onChange={e => set(k, f, e.target.value)} />
      : type === "money" ? <input className="input" type="number" step="0.01" value={s[k][f] / 100} onChange={e => set(k, f, Math.round(Number(e.target.value) * 100))} />
      : <input className="input" type={type} value={s[k][f] ?? ""} onChange={e => set(k, f, type === "number" ? Number(e.target.value) : e.target.value)} />}</label>;
  const Save = ({ k }: { k: string }) => <button className="btn-gold mt-4" onClick={() => save(k)}>Salva</button>;

  return (<div>
    <h1 className="text-3xl">Impostazioni</h1>
    <div className="mt-4 flex flex-wrap gap-2">{["generale", "aspetto", "ordini", "prenotazioni", "turni", "sicurezza", "integrazioni"].map(t => <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 py-2 text-sm capitalize ${tab === t ? "bg-gold text-ink" : "border border-cream/20"}`}>{t}</button>)}</div>
    {msg && <p className="mt-3 text-gold" role="status">{msg}</p>}
    <div className="mt-6 max-w-3xl">
      {tab === "generale" && <div className="card grid gap-4 md:grid-cols-2">
        <T k="contacts" f="address" l="Indirizzo" /><T k="contacts" f="phone" l="Telefono" /><T k="contacts" f="whatsapp" l="WhatsApp (numero)" /><T k="contacts" f="email" l="Email" />
        <T k="contacts" f="mapsUrl" l="Link Google Maps" /><T k="contacts" f="instagram" l="Instagram URL" /><T k="contacts" f="facebook" l="Facebook URL" /><T k="contacts" f="hours" l="Orari (testo)" type="textarea" />
        <div className="md:col-span-2"><Save k="contacts" /></div>
        <div className="border-t border-cream/10 pt-4 md:col-span-2"><h2 className="text-lg">SEO</h2></div><T k="seo" f="title" l="Titolo sito" /><T k="seo" f="description" l="Descrizione" type="textarea" /><div className="md:col-span-2"><Save k="seo" /></div>
      </div>}
      {tab === "aspetto" && <div className="card space-y-4">
        <div className="grid gap-4 md:grid-cols-3"><T k="brand" f="name" l="Nome" /><T k="brand" f="tagline" l="Payoff" /><T k="brand" f="motto" l="Motto" /></div>
        <div className="grid gap-4 md:grid-cols-3"><T k="brand" f="logo" l="Logo (URL)" /><T k="brand" f="mark" l="Marchio fiamma (URL)" /><T k="brand" f="favicon" l="Favicon (URL)" /></div>
        <div className="flex flex-wrap gap-6">{Object.entries({ ink: "Sfondo", coal: "Superfici", gold: "Oro", goldDeep: "Oro scuro", cream: "Testo" }).map(([k, l]) => <label key={k} className="text-center text-xs"><input type="color" className="h-12 w-16" value={rgbToHex(s.brand.colors[k])} onChange={e => setS({ ...s, brand: { ...s.brand, colors: { ...s.brand.colors, [k]: hexToRgb(e.target.value) } } })} /><span className="block">{l}</span></label>)}</div>
        <p className="text-xs text-cream/50">Palette predefinita dal brandguide Vecciarì. I font (Kurdis per titoli, Aloevera Display per testi) sono inclusi nel progetto.</p>
        <Save k="brand" /></div>}
      {tab === "ordini" && <div className="card grid gap-4 md:grid-cols-2">
        <T k="ordering" f="tableEnabled" l="Ordini dal tavolo (QR) attivi" type="bool" /><T k="ordering" f="takeawayEnabled" l="Asporto attivo" type="bool" /><T k="ordering" f="deliveryEnabled" l="Consegna a domicilio attiva" type="bool" />
        <T k="ordering" f="payAtTable" l="Pagamento al tavolo" type="bool" /><T k="ordering" f="payAtCounter" l="Pagamento alla cassa" type="bool" /><T k="ordering" f="stripeEnabled" l="Pagamento online Stripe (richiede chiavi)" type="bool" />
        <label><span className="label">Momento del pagamento</span><select className="input" value={s.ordering.payTiming} onChange={e => set("ordering", "payTiming", e.target.value)}><option value="END">A fine pasto</option><option value="ADVANCE">Anticipato</option></select></label>
        <T k="ordering" f="prepMinutes" l="Preavviso minimo asporto (min)" type="number" /><T k="ordering" f="deliveryMinCents" l="Minimo consegna €" type="money" /><T k="ordering" f="deliveryFeeCents" l="Costo consegna €" type="money" />
        <T k="ordering" f="deliveryZones" l="Zone di consegna (testo)" />
        <div className="md:col-span-2"><Save k="ordering" /></div></div>}
      {tab === "sicurezza" && <div className="card space-y-4">
        <T k="security" f="minPasswordLength" l="Lunghezza minima password staff (caratteri)" type="number" />
        <p className="text-xs text-cream/50">Vale per le nuove password e per i cambi password in Personale. L&apos;accesso è con sola password; dopo 8 tentativi errati l&apos;IP viene bloccato per 15 minuti. Recupero password Super Admin: <code>npm run admin:set -- nuovapassword</code>.</p>
        <Save k="security" /></div>}
      {tab === "prenotazioni" && <div className="card grid gap-4 md:grid-cols-2">
        <T k="reservations" f="autoConfirm" l="Conferma automatica (se c'è disponibilità)" type="bool" /><T k="reservations" f="durationMin" l="Durata prenotazione (min)" type="number" />
        <T k="reservations" f="maxPartyOnline" l="Max persone prenotabili online" type="number" /><T k="reservations" f="minNoticeMin" l="Preavviso minimo (min)" type="number" />
        <label className="md:col-span-2"><span className="label">Livelli di cottura (uno per riga)</span><textarea className="input" rows={5} value={s.cooking.join("\n")} onChange={e => setS({ ...s, cooking: e.target.value.split("\n").filter(Boolean) })} /></label>
        <div className="md:col-span-2 flex gap-3"><Save k="reservations" /><button className="btn-ghost mt-4" onClick={() => save("cooking")}>Salva cotture</button></div></div>}
    </div>
    {tab === "turni" && <div className="space-y-10">
      <ResourceManager resource="shifts" title="Turni e orari di apertura" defaults={{ weekdays: [2, 3, 4, 5, 6], slotMinutes: 30, maxCovers: 60, active: true }}
        fields={[{ name: "name", label: "Nome (Pranzo/Cena)", required: true }, { name: "weekdays", label: "Giorni", type: "weekdays", full: true }, { name: "start", label: "Inizio (HH:MM)" }, { name: "end", label: "Fine (HH:MM)" }, { name: "slotMinutes", label: "Intervallo fasce (min)", type: "number" }, { name: "maxCovers", label: "Coperti massimi turno", type: "number" }, { name: "active", label: "Attivo", type: "bool" }]}
        columns={[{ key: "name", label: "Turno" }, { key: "time", label: "Orario", render: r => `${r.start}–${r.end}` }, { key: "weekdays", label: "Giorni", render: r => r.weekdays.map((d: number) => ["D", "L", "M", "M", "G", "V", "S"][d]).join(" ") }, { key: "maxCovers", label: "Coperti" }]} />
      <ResourceManager resource="closures" title="Chiusure straordinarie e festività" fields={[{ name: "date", label: "Data", type: "date" }, { name: "reason", label: "Motivo" }]} columns={[{ key: "date", label: "Data", render: r => new Date(r.date).toLocaleDateString("it-IT") }, { key: "reason", label: "Motivo" }]} />
    </div>}
    {tab === "integrazioni" && <div className="grid max-w-4xl gap-3">{integrations.map(i => (
      <div key={i.key} className="card flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{i.name}</p><p className="text-xs text-cream/60">{i.help}</p><p className="mt-1 font-mono text-[11px] text-cream/40">{i.env}</p></div>
        <span className={`rounded-full px-3 py-1 text-xs ${i.ok ? "bg-green-800 text-green-100" : "bg-cream/10 text-cream/70"}`}>{i.ok ? "Configurata" : "Non configurata"}</span></div>))}
      <p className="text-xs text-cream/50">Le credenziali si impostano come variabili d&apos;ambiente (Secrets su Replit), mai nel database o nel codice. Dopo averle inserite riavvia l&apos;app.</p></div>}
  </div>);
}
