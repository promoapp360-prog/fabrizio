"use client";
import Translated from "@/components/public/Translated";
import { formatEUR } from "@/lib/pricing";
import type { CartLine } from "./MenuBrowser";
import { PORTION_NOTICE } from "@/lib/portions";
export default function CartPanel({ cart, setCart, notes, setNotes, onSubmit, busy, children, cta = "Invia ordine", feeCents = 0, coverCount = 0, coverUnitCents = 0, disabled = false }:
  { cart: CartLine[]; setCart: (c: CartLine[]) => void; notes: string; setNotes: (s: string) => void; onSubmit: () => void; busy: boolean; children?: React.ReactNode; cta?: string; feeCents?: number; coverCount?: number; coverUnitCents?: number; disabled?: boolean }) {
  const total = cart.reduce((s, l) => s + l.estCents, 0) + feeCents + coverCount * coverUnitCents; const weighted = cart.some(l => l.weighted);
  return <Translated>{(
    <div className="card">
      <h2 className="text-xl">Il tuo ordine</h2>
      {!cart.length ? <p className="mt-3 text-cream/60">Carrello vuoto.</p> : <>
        <ul className="mt-3 divide-y divide-cream/10">{cart.map(l => (
          <li key={l.key} className="flex justify-between gap-3 py-3 text-sm"><div><b>{l.quantity}× <span>{l.name}</span></b>
            {l.weightGrams && <p className="text-gold">{l.weightGrams} g</p>}
            {(l.cooking || l.optionNames.length > 0) && <p className="text-cream/60">{[l.cooking, ...l.optionNames].filter(Boolean).join(", ")}</p>}
            {l.notes && <p translate="no" dir="auto" className="italic text-cream/50">{l.notes}</p>}</div>
            <div className="text-right"><p>{formatEUR(l.estCents)}</p><button disabled={busy} className="text-xs text-cream/50 underline" onClick={() => setCart(cart.filter(x => x.key !== l.key))}>Rimuovi</button></div></li>))}</ul>
        <label className="mt-3 block"><span className="label">Note per la cucina</span><textarea className="input" rows={2} maxLength={500} value={notes} onChange={e => setNotes(e.target.value)} /></label>
        {children}
        {coverCount > 0 && <p className="mt-4 flex justify-between text-sm"><span><span>Coperti</span>: {coverCount} × {formatEUR(coverUnitCents)}</span><span>{formatEUR(coverCount * coverUnitCents)}</span></p>}
        {feeCents > 0 && <p className="mt-2 flex justify-between text-sm"><span>Consegna</span><span>{formatEUR(feeCents)}</span></p>}
        <p className="mt-4 flex justify-between font-display text-xl uppercase"><span>Totale definitivo</span><span className="text-gold">{formatEUR(total)}</span></p>
        {weighted && <p className="text-xs text-cream/60">{PORTION_NOTICE}</p>}
        <button className="btn-gold mt-4 w-full" disabled={busy || disabled} onClick={onSubmit}>{busy ? "Invio…" : cta}</button>
      </>}
    </div>)}</Translated>;
}
