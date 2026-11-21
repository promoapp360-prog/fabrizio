"use client";
import Translated from "./Translated";
import type { DiningParty } from "./useDiningParty";
import { formatEUR } from "@/lib/pricing";

export default function DiningPartySetup({ party, table, onTableChange, fixedTable = false }: {
  party: DiningParty; table: string; onTableChange: (value: string) => void; fixedTable?: boolean;
}) {
  return <Translated><section className="card mb-6 space-y-4" aria-label="Persone">
    {!fixedTable && <label className="block"><span className="label">Numero del tavolo *</span>
      <input className="input" type="number" min={1} max={999} value={table} onChange={e => onTableChange(e.target.value)} /></label>}
    {!party.confirmed ? <>
      <h2 className="text-xl">Per chi stai ordinando?</h2>
      <div className="flex flex-wrap gap-3">
        <button className={party.people === 1 ? "btn-gold" : "btn-ghost"} onClick={() => party.setPeople(1)}>Solo per me</button>
        <button className={party.people > 1 ? "btn-gold" : "btn-ghost"} onClick={() => party.setPeople(Math.max(2, party.people))}>Anche per altre persone</button>
      </div>
      {party.people > 1 && <label className="block"><span className="label">Numero di persone (te compreso)</span>
        <input className="input" type="number" min={2} max={50} value={party.people} onChange={e => party.setPeople(Math.min(50, Math.max(2, Number(e.target.value) || 2)))} /></label>}
      <button className="btn-gold" disabled={!party.ready} onClick={() => party.setConfirmed(true)}>Continua</button>
    </> : <div className="flex items-center justify-between gap-4"><p><span>Persone</span>: <b>{party.people}</b></p>
      <button className="text-sm text-gold underline" onClick={() => party.setConfirmed(false)}>Modifica</button></div>}
    {!!party.coveredCount && <p className="text-sm text-cream/70"><span>Coperti già conteggiati</span>: {party.coveredCount}</p>}
    {party.ready && <p className="text-sm"><span>Coperti</span>: {party.coverCount} × {formatEUR(party.coverUnitCents)} = <b className="text-gold">{formatEUR(party.coverCents)}</b></p>}
    {party.error && <p role="alert" className="text-sm text-red-300">{party.error} <button className="underline" onClick={party.refresh}>Riprova</button></p>}
  </section></Translated>;
}
