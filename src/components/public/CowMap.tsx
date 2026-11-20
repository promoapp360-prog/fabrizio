"use client";
import Translated from "@/components/public/Translated";
import Link from "next/link";
import { useState } from "react";
import { ZONES } from "@/lib/meat-zones";

/**
 * Schema anatomico semplificato del bovino (vista laterale, testa a sinistra).
 * Zone primarie secondo la sezionatura classica: collo, spalla (chuck), costata (rib),
 * lombata (short loin), scamone/sirloin, coscia (round), petto (brisket), pancia (plate), fianco (flank), stinco.
 * Ogni taglio del DB è associato a una zona tramite il campo `zone`.
 */

export default function CowMap({ cuts }: { cuts: { slug: string; name: string; zone: string | null }[] }) {
  const [zone, setZone] = useState<string | null>("rib");
  const z = ZONES.find(x => x.id === zone);
  const inZone = cuts.filter(c => c.zone === zone);
  return <Translated>{(
    <div className="grid items-start gap-8 lg:grid-cols-[1.6fr_1fr]">
      <svg viewBox="100 60 640 300" className="w-full" role="group" aria-label="Schema dei tagli del bovino">
        <path d="M150 120 Q120 95 105 110 Q95 140 120 150 L150 160 Z" fill="rgb(var(--c-coal))" stroke="rgb(var(--c-gold) / .4)" />
        {ZONES.map(x => {
          const n = cuts.filter(c => c.zone === x.id).length; const active = zone === x.id;
          return (
            <g key={x.id}>
              <path d={x.d} tabIndex={0} role="button" aria-pressed={active} aria-label={`${x.label}: ${n} tagli`}
                onClick={() => setZone(x.id)} onKeyDown={e => (e.key === "Enter" || e.key === " ") && setZone(x.id)}
                className="cursor-pointer outline-none transition"
                fill={active ? "rgb(var(--c-gold))" : n ? "rgb(var(--c-gold) / .18)" : "rgb(var(--c-coal))"}
                stroke="rgb(var(--c-gold) / .7)" strokeWidth={active ? 2 : 1} />
              <text x={x.lx} y={x.ly} textAnchor="middle" pointerEvents="none" className="font-display uppercase" fontSize="11" fill={active ? "#0A0A08" : "rgb(var(--c-cream) / .8)"}>{x.label}</text>
            </g>);
        })}
      </svg>
      <div className="card" aria-live="polite">
        <p className="label">Zona selezionata</p>
        <h3 className="text-2xl">{z?.label ?? "—"}</h3>
        {inZone.length ? <ul className="mt-4 space-y-2">{inZone.map(c => <li key={c.slug}><Link href={`/carne/tagli/${c.slug}`} className="text-gold hover:underline">{c.name} →</Link></li>)}</ul>
          : <p className="mt-4 text-cream/60">Nessun taglio ancora associato a questa zona.</p>}
        <p className="mt-6 text-xs text-cream/40">Schema semplificato a scopo divulgativo.</p>
      </div>
    </div>)}</Translated>;
}
