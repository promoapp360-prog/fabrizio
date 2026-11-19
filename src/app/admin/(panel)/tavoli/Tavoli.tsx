"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ResourceManager, { api } from "@/components/admin/ResourceManager";
/* eslint-disable @typescript-eslint/no-explicit-any */
export default function Tavoli({ tables, menuSvg, menuUrl }: { tables: any[]; menuSvg: string; menuUrl: string }) {
  const router = useRouter(); const [view, setView] = useState<"sala" | "qr" | "config">("sala"); const [drag, setDrag] = useState<string | null>(null);
  const regen = async (id: string) => { if (confirm("Rigenerare il QR? Il codice stampato attuale smetterà di funzionare.")) { await api(`/api/admin/qr/${id}`, "POST"); router.refresh(); } };
  const disable = async (id: string) => { if (confirm("Disattivare il QR del tavolo?")) { await api(`/api/admin/qr/${id}`, "DELETE"); router.refresh(); } };
  const closeSession = async (t: any) => { if (confirm(`Liberare il tavolo ${t.number}? (chiude la sessione ordini)`)) { await api(`/api/admin/tables/${t.id}/close`, "POST"); router.refresh(); } };
  const move = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!drag) return; const r = e.currentTarget.getBoundingClientRect();
    await api(`/api/admin/r/tables/${drag}`, "PATCH", { posX: Math.round(((e.clientX - r.left) / r.width) * 100), posY: Math.round(((e.clientY - r.top) / r.height) * 100) });
    setDrag(null); router.refresh();
  };
  return (<div>
    <div className="no-print mb-6 flex gap-2">{([["sala", "Mappa sala"], ["qr", "QR code"], ["config", "Configura tavoli"]] as const).map(([k, l]) => <button key={k} onClick={() => setView(k)} className={`rounded-full px-4 py-2 text-sm ${view === k ? "bg-gold text-ink" : "border border-cream/20"}`}>{l}</button>)}</div>
    {view === "sala" && <>
      <p className="mb-2 text-sm text-cream/60">{drag ? "Clicca nel punto della sala dove spostare il tavolo." : "Clicca \"Sposta\" su un tavolo per riposizionarlo."}</p>
      <div onClick={move} className={`relative aspect-[16/9] w-full rounded-2xl border border-cream/10 bg-coal ${drag ? "cursor-crosshair" : ""}`}>
        {tables.map(t => (
          <div key={t.id} style={{ left: `${t.posX}%`, top: `${t.posY}%` }} onClick={e => e.stopPropagation()}
            className={`absolute w-28 -translate-x-1/2 -translate-y-1/2 rounded-xl border p-2 text-center text-xs ${!t.active ? "opacity-40" : t.occupied ? "border-gold bg-gold/20" : "border-cream/20 bg-ink"}`}>
            <p className="font-display text-lg">T{t.number}</p><p>{t.seats} posti · {t.occupied ? `occupato (${t.orders} ord.)` : "libero"}</p>
            {t.reservations.map((r: string) => <p key={r} className="truncate text-gold">{r}</p>)}
            <div className="mt-1 flex justify-center gap-2"><button className="underline" onClick={() => setDrag(t.id)}>Sposta</button>{t.occupied && <button className="underline" onClick={() => closeSession(t)}>Libera</button>}</div>
          </div>))}
      </div></>}
    {view === "qr" && <div>
      <div className="no-print mb-4 flex gap-2"><button className="btn-gold !py-2" onClick={() => print()}>Stampa tutti</button></div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 print:grid-cols-2">
        <div className="rounded-xl bg-white p-4 text-center text-ink break-inside-avoid"><div dangerouslySetInnerHTML={{ __html: menuSvg }} /><p className="font-display text-lg uppercase">Menu</p><p className="break-all text-[10px]">{menuUrl}</p></div>
        {tables.map(t => <div key={t.id} className="rounded-xl bg-white p-4 text-center text-ink break-inside-avoid">
          {t.svg ? <div dangerouslySetInnerHTML={{ __html: t.svg }} /> : <p className="py-16 text-sm">QR disattivato</p>}
          <img src="/brand/fiamma-oro.webp" alt="" className="mx-auto -mt-2 h-8" />
          <p className="font-display text-xl uppercase">Tavolo {t.number}</p><p className="text-xs">Scansiona per ordinare</p>
          <div className="no-print mt-2 flex justify-center gap-3 text-xs"><button className="underline" onClick={() => regen(t.id)}>{t.svg ? "Rigenera" : "Attiva"}</button>{t.svg && <button className="underline" onClick={() => disable(t.id)}>Disattiva</button>}
            {t.svg && <a className="underline" download={`qr-tavolo-${t.number}.svg`} href={`data:image/svg+xml;utf8,${encodeURIComponent(t.svg)}`}>SVG</a>}</div>
        </div>)}
      </div></div>}
    {view === "config" && <ResourceManager resource="tables" title="Tavoli" defaults={{ seats: 4, area: "Sala", active: true, reservable: true, posX: 50, posY: 50 }}
      fields={[{ name: "number", label: "Numero", type: "number", required: true }, { name: "label", label: "Etichetta" }, { name: "seats", label: "Posti", type: "number" }, { name: "area", label: "Area" }, { name: "active", label: "Attivo", type: "bool" }, { name: "reservable", label: "Prenotabile online", type: "bool" }]}
      columns={[{ key: "number", label: "N°" }, { key: "seats", label: "Posti" }, { key: "area", label: "Area" }, { key: "qr", label: "QR", render: r => r.qrCodes.length ? "Attivo" : "—" }]}
      extraActions={(r, reload) => !r.qrCodes.length ? <button className="text-gold underline" onClick={async () => { await api(`/api/admin/qr/${r.id}`, "POST"); reload(); router.refresh(); }}>Genera QR</button> : null} />}
  </div>);
}
