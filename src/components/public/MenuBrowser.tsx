"use client";
import { useMemo, useState } from "react";
import type { MenuData } from "@/lib/menu";
import { formatEUR, priceLabel, lineCents, isWeighted, type PriceMode } from "@/lib/pricing";

type P = MenuData["products"][number];
export type CartLine = { key: string; productId: string; name: string; quantity: number; cooking?: string; optionIds: string[]; optionNames: string[]; notes?: string; estCents: number; weighted: boolean };

export default function MenuBrowser({ menu, cooking, cartEnabled = false, onCartChange, cart = [] }:
  { menu: MenuData; cooking: string[]; cartEnabled?: boolean; cart?: CartLine[]; onCartChange?: (c: CartLine[]) => void }) {
  const [q, setQ] = useState(""); const [cat, setCat] = useState<string | null>(null);
  const [noAllergen, setNoAllergen] = useState<string[]>([]); const [open, setOpen] = useState<P | null>(null);
  const allergens = useMemo(() => Array.from(new Map(menu.products.flatMap(p => p.allergens).map(a => [a.code, a.name]))), [menu]);
  const roots = menu.categories.filter(c => !c.parentId);
  const catIds = (id: string): string[] => [id, ...menu.categories.filter(c => c.parentId === id).flatMap(c => catIds(c.id))];

  const filtered = menu.products.filter(p =>
    (!q || `${p.name} ${p.description ?? ""} ${p.ingredients ?? ""}`.toLowerCase().includes(q.toLowerCase())) &&
    (!cat || catIds(cat).includes(p.categoryId)) &&
    !p.allergens.some(a => noAllergen.includes(a.code)));
  const specials = filtered.filter(p => p.dailySpecial || p.offMenu);

  return (
    <div>
      {!!menu.promos.length && <div className="mb-6 space-y-2">{menu.promos.map(p => <div key={p.id} className="rounded-xl bg-gold-grad px-4 py-3 text-ink"><b className="font-display uppercase">{p.title}</b> {p.description}</div>)}</div>}
      <div className="sticky top-16 z-30 -mx-4 space-y-3 bg-ink/95 px-4 py-3 backdrop-blur">
        <input className="input" type="search" placeholder="Cerca piatti, ingredienti…" aria-label="Cerca nel menu" value={q} onChange={e => setQ(e.target.value)} />
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Categorie">
          <button role="tab" aria-selected={!cat} onClick={() => setCat(null)} className={`shrink-0 rounded-full px-4 py-1.5 text-sm ${!cat ? "bg-gold text-ink" : "border border-cream/20"}`}>Tutto</button>
          {roots.map(c => <button key={c.id} role="tab" aria-selected={cat === c.id} onClick={() => setCat(c.id)} className={`shrink-0 rounded-full px-4 py-1.5 text-sm ${cat === c.id ? "bg-gold text-ink" : "border border-cream/20"}`}>{c.name}</button>)}
        </div>
        {!!allergens.length && <details className="text-sm"><summary className="cursor-pointer text-cream/70">Filtra allergeni {noAllergen.length ? `(${noAllergen.length})` : ""}</summary>
          <div className="mt-2 flex flex-wrap gap-2">{allergens.map(([code, name]) => <label key={code} className="flex items-center gap-1 rounded-full border border-cream/20 px-3 py-1"><input type="checkbox" checked={noAllergen.includes(code)} onChange={e => setNoAllergen(e.target.checked ? [...noAllergen, code] : noAllergen.filter(x => x !== code))} /> senza {name}</label>)}</div></details>}
      </div>

      {!cat && !q && !!specials.length && <section className="mt-6"><h2 className="text-2xl text-gold">Del giorno e fuori menu</h2><List items={specials} onOpen={setOpen} /></section>}
      {(cat ? menu.categories.filter(c => catIds(cat).includes(c.id)) : menu.categories).map(c => {
        const items = filtered.filter(p => p.categoryId === c.id);
        if (!items.length) return null;
        return <section key={c.id} className="mt-8" aria-labelledby={`c-${c.id}`}><h2 id={`c-${c.id}`} className="text-2xl">{c.name}</h2><List items={items} onOpen={setOpen} /></section>;
      })}
      {!filtered.length && <p className="mt-10 text-center text-cream/60">Nessun piatto trovato.</p>}
      {open && <ProductSheet p={open} cooking={cooking} cartEnabled={cartEnabled} onClose={() => setOpen(null)}
        onAdd={line => { onCartChange?.([...cart, line]); setOpen(null); }} />}
    </div>);
}

function List({ items, onOpen }: { items: P[]; onOpen: (p: P) => void }) {
  return <ul className="mt-3 divide-y divide-cream/10">{items.map(p => (
    <li key={p.id}><button onClick={() => onOpen(p)} disabled={!p.available} className="flex w-full gap-4 py-4 text-left disabled:opacity-50">
      {p.image && <img src={p.image} alt="" loading="lazy" className="h-20 w-20 shrink-0 rounded-xl object-cover" />}
      <div className="min-w-0 flex-1">
        <p className="font-display uppercase">{p.name} {p.isDemo && <span className="demo-badge">Demo</span>} {p.seasonal && <span className="demo-badge">Stagionale</span>}</p>
        {p.description && <p className="line-clamp-2 text-sm text-cream/60">{p.description}</p>}
        {!!p.allergens.length && <p className="mt-1 text-[11px] text-cream/50">Allergeni: {p.allergens.map(a => a.name + (a.traces ? " (tracce)" : "")).join(", ")}</p>}
        {!p.available && <p className="text-xs text-gold">Esaurito</p>}
      </div>
      <p className="shrink-0 text-right text-gold">{priceLabel(p.priceMode as PriceMode, p.priceCents)}
        {isWeighted(p.priceMode as PriceMode) && p.estWeightGrams && <span className="block text-[11px] text-cream/50">≈ {p.estWeightGrams} g</span>}</p>
    </button></li>))}</ul>;
}

function ProductSheet({ p, cooking, cartEnabled, onClose, onAdd }: { p: P; cooking: string[]; cartEnabled: boolean; onClose: () => void; onAdd: (l: CartLine) => void }) {
  const [qty, setQty] = useState(1); const [cook, setCook] = useState<string>(""); const [sel, setSel] = useState<string[]>([]); const [notes, setNotes] = useState("");
  const opts = p.groups.flatMap(g => g.options);
  const optCents = sel.reduce((s, id) => s + (opts.find(o => o.id === id)?.priceCents ?? 0), 0);
  const weighted = isWeighted(p.priceMode as PriceMode);
  const est = lineCents({ priceMode: p.priceMode as PriceMode, unitCents: p.priceCents, optionsCents: optCents, quantity: qty, weightGrams: p.estWeightGrams });
  const groupOk = p.groups.every(g => { const n = sel.filter(id => g.options.some(o => o.id === id)).length; return n >= g.min && n <= g.max; });
  const toggle = (g: P["groups"][number], id: string) => {
    const inG = sel.filter(x => g.options.some(o => o.id === x));
    if (sel.includes(id)) return setSel(sel.filter(x => x !== id));
    if (g.max === 1) return setSel([...sel.filter(x => !inG.includes(x)), id]);
    if (inG.length < g.max) setSel([...sel, id]);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 md:items-center" role="dialog" aria-modal="true" aria-labelledby="ps-title" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-coal p-6 md:rounded-3xl" onClick={e => e.stopPropagation()}>
        {p.image && <img src={p.image} alt="" className="-mx-6 -mt-6 mb-4 aspect-video w-[calc(100%+3rem)] max-w-none object-cover" />}
        <div className="flex items-start justify-between gap-4"><h3 id="ps-title" className="text-2xl">{p.name}</h3><button onClick={onClose} aria-label="Chiudi" className="text-2xl">×</button></div>
        <p className="text-gold">{priceLabel(p.priceMode as PriceMode, p.priceCents)}</p>
        {p.description && <p className="mt-3 text-cream/80">{p.description}</p>}
        {p.ingredients && <p className="mt-2 text-sm text-cream/60"><b>Ingredienti:</b> {p.ingredients}</p>}
        {(p.breed || p.cut || p.origin) && <p className="mt-2 text-sm text-cream/60">{[p.breed?.name, p.cut?.name, p.origin].filter(Boolean).join(" · ")}</p>}
        <p className="mt-2 text-sm"><b>Allergeni:</b> {p.allergens.length ? p.allergens.map(a => a.name + (a.traces ? " (tracce)" : "")).join(", ") : "nessuno dichiarato"}. <span className="text-cream/50">Chiedi al personale per informazioni.</span></p>
        {p.pairing && <p className="mt-2 text-sm text-cream/60"><b>Abbinamento:</b> {p.pairing}</p>}
        {weighted && <p className="mt-3 rounded-lg border border-gold/30 p-3 text-sm">Prezzo a peso: importo <b>indicativo</b> calcolato su ≈{p.estWeightGrams} g. L&apos;importo definitivo sul peso effettivo ti sarà comunicato e confermato prima del pagamento.</p>}

        {cartEnabled && <>
          {p.hasCooking && <fieldset className="mt-5"><legend className="label">Cottura *</legend><div className="flex flex-wrap gap-2">{cooking.map(c => <button key={c} type="button" aria-pressed={cook === c} onClick={() => setCook(c)} className={`rounded-full px-3 py-1.5 text-sm ${cook === c ? "bg-gold text-ink" : "border border-cream/20"}`}>{c}</button>)}</div></fieldset>}
          {p.groups.map(g => <fieldset key={g.id} className="mt-5"><legend className="label">{g.name} {g.min > 0 && "*"} <span className="normal-case">({g.max === 1 ? "scegli 1" : `max ${g.max}`})</span></legend>
            {g.options.map(o => <label key={o.id} className="flex items-center justify-between py-1.5"><span className="flex items-center gap-2"><input type={g.max === 1 ? "radio" : "checkbox"} name={g.id} checked={sel.includes(o.id)} onChange={() => toggle(g, o.id)} /> {o.name}</span>{o.priceCents > 0 && <span className="text-sm text-cream/60">+{formatEUR(o.priceCents)}</span>}</label>)}</fieldset>)}
          <label className="mt-5 block"><span className="label">Note per la cucina</span><input className="input" maxLength={200} value={notes} onChange={e => setNotes(e.target.value)} /></label>
          <div className="mt-6 flex items-center gap-4">
            <div className="flex items-center rounded-full border border-cream/20"><button className="px-4 py-2" aria-label="Meno" onClick={() => setQty(Math.max(1, qty - 1))}>−</button><span aria-live="polite">{qty}</span><button className="px-4 py-2" aria-label="Più" onClick={() => setQty(Math.min(20, qty + 1))}>+</button></div>
            <button className="btn-gold flex-1" disabled={(p.hasCooking && !cook) || !groupOk}
              onClick={() => onAdd({ key: crypto.randomUUID(), productId: p.id, name: p.name, quantity: qty, cooking: cook || undefined, optionIds: sel, optionNames: sel.map(id => opts.find(o => o.id === id)!.name), notes: notes || undefined, estCents: est, weighted })}>
              Aggiungi · {weighted ? "≈ " : ""}{formatEUR(est)}</button>
          </div>
        </>}
      </div>
    </div>);
}
