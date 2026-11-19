"use client";
import Link from "next/link";
import { useState } from "react";

/**
 * Schema anatomico semplificato del bovino (vista laterale, testa a sinistra).
 * Zone primarie secondo la sezionatura classica: collo, spalla (chuck), costata (rib),
 * lombata (short loin), scamone/sirloin, coscia (round), petto (brisket), pancia (plate), fianco (flank), stinco.
 * Ogni taglio del DB è associato a una zona tramite il campo `zone`.
 */
export const ZONES: { id: string; label: string; d: string; lx: number; ly: number }[] = [
  { id: "neck", label: "Collo", d: "M150 120 L215 105 L225 205 L165 215 Z", lx: 190, ly: 160 },
  { id: "chuck", label: "Spalla", d: "M215 105 L330 95 L330 215 L225 205 Z", lx: 272, ly: 155 },
  { id: "rib", label: "Costata", d: "M330 95 L430 92 L430 175 L330 180 Z", lx: 380, ly: 138 },
  { id: "loin", label: "Lombata", d: "M430 92 L530 95 L530 172 L430 175 Z", lx: 480, ly: 135 },
  { id: "sirloin", label: "Scamone", d: "M530 95 L610 102 L605 175 L530 172 Z", lx: 568, ly: 138 },
  { id: "round", label: "Coscia", d: "M610 102 L680 120 L690 205 L640 270 L590 270 L605 175 Z", lx: 640, ly: 195 },
  { id: "brisket", label: "Petto", d: "M225 205 L330 215 L330 265 L240 262 Z", lx: 280, ly: 238 },
  { id: "plate", label: "Pancia", d: "M330 180 L430 175 L430 262 L330 265 Z", lx: 380, ly: 225 },
  { id: "flank", label: "Fianco", d: "M430 175 L605 175 L590 270 L430 262 Z", lx: 515, ly: 222 },
  { id: "shank", label: "Stinco", d: "M240 262 L300 264 L295 330 L255 330 Z M590 270 L640 270 L635 335 L600 335 Z", lx: 275, ly: 300 },
];

export default function CowMap({ cuts }: { cuts: { slug: string; name: string; zone: string | null }[] }) {
  const [zone, setZone] = useState<string | null>("rib");
  const z = ZONES.find(x => x.id === zone);
  const inZone = cuts.filter(c => c.zone === zone);
  return (
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
    </div>);
}
