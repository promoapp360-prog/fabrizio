"use client";
import { useEffect, useState } from "react";
import ResourceManager, { api } from "@/components/admin/ResourceManager";
import { ZONES } from "@/lib/meat-zones";
/* eslint-disable @typescript-eslint/no-explicit-any */
export default function MeatAdmin() {
  const [tab, setTab] = useState<"breeds" | "cuts" | "farming">("breeds");
  const [cuts, setCuts] = useState<any[]>([]); const [farm, setFarm] = useState<any[]>([]);
  useEffect(() => { api("/api/admin/r/cuts").then(setCuts); api("/api/admin/r/farming").then(setFarm); }, [tab]);
  const o = (xs: any[]) => xs.map(x => ({ value: x.id, label: x.name }));
  return (<div>
    <div className="mb-6 flex gap-2">{([["breeds", "Razze"], ["cuts", "Tagli"], ["farming", "Allevamento"]] as const).map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`rounded-full px-4 py-2 text-sm ${tab === k ? "bg-gold text-ink" : "border border-cream/20"}`}>{l}</button>)}</div>
    {tab === "breeds" && <ResourceManager key="b" resource="breeds" title="Razze e selezioni" canDuplicate defaults={{ images: [], published: true, available: false, cutIds: [] }}
      toForm={r => ({ ...r, cutIds: r.cuts.map((c: any) => c.cutId) })}
      fields={[{ name: "name", label: "Nome", required: true }, { name: "slug", label: "Slug", required: true }, { name: "type", label: "Tipologia" }, { name: "country", label: "Paese di origine" }, { name: "region", label: "Provenienza geografica" },
        { name: "farmingMethodId", label: "Allevamento", type: "select", options: o(farm) }, { name: "feeding", label: "Alimentazione" }, { name: "ageing", label: "Frollatura e maturazione" },
        { name: "marbling", label: "Marezzatura (1-5)", type: "number" }, { name: "tenderness", label: "Tenerezza (1-5)", type: "number" }, { name: "flavour", label: "Intensità gusto (1-5)", type: "number" }, { name: "position", label: "Ordine", type: "number" },
        { name: "tasting", label: "Caratteristiche organolettiche", type: "textarea" }, { name: "body", label: "Curiosità e approfondimenti", type: "textarea" },
        { name: "certifications", label: "Certificazioni e tracciabilità", type: "textarea", help: "Inserire solo se documentate" }, { name: "certVerified", label: "Certificazioni verificate su documenti", type: "bool" },
        { name: "cutIds", label: "Tagli associati", type: "multiselect", options: o(cuts) }, { name: "images", label: "Foto (URL)", type: "images" }, { name: "videoUrl", label: "Video (URL)" },
        { name: "available", label: "Disponibile (confermato dal ristoratore)", type: "bool" }, { name: "published", label: "Pubblicata", type: "bool" }, { name: "isDemo", label: "Dato dimostrativo", type: "bool" }]}
      columns={[{ key: "name", label: "Razza", render: r => <>{r.name} {r.isDemo && <span className="demo-badge">Demo</span>}</> }, { key: "country", label: "Origine" }, { key: "available", label: "Disponibile", render: r => r.available ? "Sì" : "No" }, { key: "published", label: "Pubblicata", render: r => r.published ? "Sì" : "No" }]} />}
    {tab === "cuts" && <ResourceManager key="c" resource="cuts" title="Atlante dei tagli" canDuplicate defaults={{ images: [], published: true }}
      fields={[{ name: "name", label: "Nome", required: true }, { name: "slug", label: "Slug", required: true }, { name: "altNames", label: "Altri nomi" },
        { name: "zone", label: "Zona nell'illustrazione", type: "select", options: ZONES.map(z => ({ value: z.id, label: z.label })) }, { name: "anatomy", label: "Posizione anatomica" }, { name: "position", label: "Ordine", type: "number" },
        { name: "description", label: "Caratteristiche", type: "textarea" }, { name: "flavour", label: "Sapore" }, { name: "texture", label: "Consistenza" }, { name: "cooking", label: "Modalità di cottura" }, { name: "ageing", label: "Frollatura" },
        { name: "images", label: "Foto (URL)", type: "images" }, { name: "published", label: "Pubblicato", type: "bool" }, { name: "isDemo", label: "Dato dimostrativo", type: "bool" }]}
      columns={[{ key: "name", label: "Taglio", render: r => <>{r.name} {r.isDemo && <span className="demo-badge">Demo</span>}</> }, { key: "zone", label: "Zona", render: r => ZONES.find(z => z.id === r.zone)?.label ?? "—" }]} />}
    {tab === "farming" && <ResourceManager key="f" resource="farming" title="Tipologie di allevamento"
      fields={[{ name: "name", label: "Nome", required: true }, { name: "slug", label: "Slug", required: true }, { name: "description", label: "Descrizione", type: "textarea", required: true }]}
      columns={[{ key: "name", label: "Nome" }, { key: "description", label: "Descrizione", render: r => <span className="line-clamp-1">{r.description}</span> }]} />}
  </div>);
}
