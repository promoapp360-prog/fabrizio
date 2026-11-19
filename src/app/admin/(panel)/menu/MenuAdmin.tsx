"use client";
import { useEffect, useState } from "react";
import ResourceManager, { api } from "@/components/admin/ResourceManager";
import { priceLabel, type PriceMode } from "@/lib/pricing";
/* eslint-disable @typescript-eslint/no-explicit-any */
export default function MenuAdmin() {
  const [tab, setTab] = useState<"products" | "categories" | "allergens">("products");
  const [cats, setCats] = useState<any[]>([]); const [alls, setAlls] = useState<any[]>([]); const [breeds, setBreeds] = useState<any[]>([]); const [cuts, setCuts] = useState<any[]>([]);
  useEffect(() => { Promise.all([api("/api/admin/r/categories"), api("/api/admin/r/allergens"), api("/api/admin/r/breeds").catch(() => []), api("/api/admin/r/cuts").catch(() => [])]).then(([a, b, c, d]) => { setCats(a); setAlls(b); setBreeds(c); setCuts(d); }); }, [tab]);
  const o = (xs: any[]) => xs.map(x => ({ value: x.id, label: x.name }));
  const quick = async (r: any, data: any, reload: () => void) => { await api(`/api/admin/r/products/${r.id}`, "PATCH", data); reload(); };
  return (<div>
    <div className="mb-6 flex gap-2">{([["products", "Piatti"], ["categories", "Categorie"], ["allergens", "Allergeni"]] as const).map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`rounded-full px-4 py-2 text-sm ${tab === k ? "bg-gold text-ink" : "border border-cream/20"}`}>{l}</button>)}</div>
    {tab === "products" && <ResourceManager key="p" resource="products" title="Piatti" canDuplicate
      defaults={{ priceMode: "FIXED", priceCents: 0, available: true, active: true, channels: ["TABLE", "TAKEAWAY", "DELIVERY"], images: [], position: 0, allergenIds: [], traceIds: [], optionGroups: [] }}
      toForm={r => ({ ...r, allergenIds: r.allergens.filter((a: any) => !a.traces).map((a: any) => a.allergenId), traceIds: r.allergens.filter((a: any) => a.traces).map((a: any) => a.allergenId),
        optionGroups: r.optionGroups.map((g: any) => ({ name: g.name, minSelect: g.minSelect, maxSelect: g.maxSelect, options: g.options.map((x: any) => ({ name: x.name, priceCents: x.priceCents, available: x.available })) })) })}
      fields={[
        { name: "name", label: "Nome", required: true }, { name: "slug", label: "Slug URL", required: true, help: "minuscole-con-trattini" },
        { name: "categoryId", label: "Categoria", type: "select", options: o(cats), required: true },
        { name: "priceMode", label: "Tipo prezzo", type: "select", options: [{ value: "FIXED", label: "Prezzo fisso" }, { value: "PER_KG", label: "Al kg" }, { value: "PER_HG", label: "All'etto" }, { value: "PER_PORTION", label: "A porzione" }] },
        { name: "priceCents", label: "Prezzo €", type: "money", required: true }, { name: "takeawayPriceCents", label: "Prezzo asporto/consegna € (opz.)", type: "money" },
        { name: "estWeightGrams", label: "Peso indicativo (g)", type: "number", help: "Per prezzi a peso: base della stima" }, { name: "position", label: "Ordine", type: "number" },
        { name: "description", label: "Descrizione", type: "textarea" }, { name: "ingredients", label: "Ingredienti", type: "textarea" },
        { name: "allergenIds", label: "Allergeni presenti", type: "multiselect", options: o(alls) }, { name: "traceIds", label: "Può contenere tracce di", type: "multiselect", options: o(alls) },
        { name: "breedId", label: "Razza collegata", type: "select", options: o(breeds) }, { name: "cutId", label: "Taglio collegato", type: "select", options: o(cuts) },
        { name: "origin", label: "Provenienza" }, { name: "pairing", label: "Abbinamento consigliato" },
        { name: "images", label: "Immagini (URL, una per riga)", type: "images", help: "Carica le foto da Contenuti › Media e incolla qui l'URL" },
        { name: "channels", label: "Canali", type: "multiselect", options: [{ value: "TABLE", label: "Tavolo" }, { value: "TAKEAWAY", label: "Asporto" }, { value: "DELIVERY", label: "Consegna" }] },
        { name: "hasCooking", label: "Chiedi cottura", type: "bool" }, { name: "available", label: "Disponibile", type: "bool" }, { name: "active", label: "Attivo nel menu", type: "bool" },
        { name: "dailySpecial", label: "Piatto del giorno", type: "bool" }, { name: "offMenu", label: "Fuori menu", type: "bool" }, { name: "seasonal", label: "Stagionale", type: "bool" }, { name: "isDemo", label: "Dato dimostrativo", type: "bool" },
        { name: "optionGroups", label: "Varianti, contorni e aggiunte", type: "json", help: 'Es. [{"name":"Contorno","minSelect":0,"maxSelect":1,"options":[{"name":"Patate","priceCents":400,"available":true}]}]' },
      ]}
      columns={[
        { key: "name", label: "Piatto", render: r => <span>{r.name} {r.isDemo && <span className="demo-badge">Demo</span>}</span> },
        { key: "category", label: "Categoria", render: r => r.category?.name },
        { key: "price", label: "Prezzo", render: r => priceLabel(r.priceMode as PriceMode, r.priceCents) },
        { key: "available", label: "Stato", render: r => !r.active ? "Disattivato" : r.available ? <span className="text-green-400">Disponibile</span> : <span className="text-gold">Esaurito</span> },
      ]}
      extraActions={(r, reload) => <><button className="text-cream/70 hover:underline" onClick={() => quick(r, { available: !r.available }, reload)}>{r.available ? "Segna esaurito" : "Disponibile"}</button>
        <button className="ml-3 text-cream/70 hover:underline" onClick={() => { const v = prompt(`Nuovo prezzo per ${r.name} (€)`, (r.priceCents / 100).toFixed(2)); if (v) quick(r, { priceCents: Math.round(parseFloat(v.replace(",", ".")) * 100) }, reload); }}>Prezzo</button></>} />}
    {tab === "categories" && <ResourceManager key="c" resource="categories" title="Categorie" defaults={{ active: true, position: 0 }}
      fields={[{ name: "name", label: "Nome", required: true }, { name: "slug", label: "Slug", required: true }, { name: "parentId", label: "Categoria padre (sottocategoria)", type: "select", options: o(cats) }, { name: "position", label: "Ordine", type: "number" }, { name: "active", label: "Attiva", type: "bool" }]}
      columns={[{ key: "name", label: "Nome" }, { key: "parent", label: "Padre", render: r => cats.find(c => c.id === r.parentId)?.name ?? "—" }, { key: "position", label: "Ordine" }]} />}
    {tab === "allergens" && <ResourceManager key="a" resource="allergens" title="Allergeni" fields={[{ name: "code", label: "Codice", required: true }, { name: "name", label: "Nome", required: true }]} columns={[{ key: "code", label: "Codice" }, { key: "name", label: "Nome" }]} />}
    <p className="mt-4 text-xs text-cream/40">I prezzi mostrati sono letti dal database: ogni modifica è subito visibile nel menu pubblico.</p>
  </div>);
}
