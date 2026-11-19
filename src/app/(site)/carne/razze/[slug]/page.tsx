import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import Meter from "@/components/public/Meter";
import { priceLabel, type PriceMode } from "@/lib/pricing";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const b = await db.breed.findUnique({ where: { slug: params.slug } });
  return { title: b?.name ?? "Razza", description: b?.tasting ?? undefined };
}

export default async function Razza({ params }: { params: { slug: string } }) {
  const b = await db.breed.findUnique({ where: { slug: params.slug }, include: { farmingMethod: true, cuts: { include: { cut: true } }, products: { where: { active: true } } } });
  if (!b || !b.published) notFound();
  const facts: [string, string | null][] = [["Tipologia", b.type], ["Paese di origine", b.country], ["Provenienza", b.region], ["Allevamento", b.farmingMethod?.name ?? null], ["Alimentazione", b.feeding], ["Frollatura e maturazione", b.ageing]];
  return (
    <article className="mx-auto max-w-6xl px-4 py-16">
      <Link href="/carne#razze" className="text-sm text-gold">← Tutte le razze</Link>
      <div className="mt-6 grid gap-12 md:grid-cols-2">
        <div>{b.isDemo && <span className="demo-badge">Contenuto dimostrativo</span>}
          <h1 className="mt-2 text-5xl md:text-6xl">{b.name}</h1>
          <p className={`mt-4 text-sm uppercase tracking-widest ${b.available ? "text-gold" : "text-cream/50"}`}>{b.available ? "Disponibile da noi" : "Disponibilità da verificare con il ristorante"}</p>
          <p className="mt-6 text-lg leading-relaxed text-cream/80">{b.tasting}</p>
          <div className="mt-8 grid grid-cols-1 gap-4"><Meter label="Marezzatura" value={b.marbling} /><Meter label="Tenerezza" value={b.tenderness} /><Meter label="Intensità del gusto" value={b.flavour} /></div>
        </div>
        <div className="space-y-4">{b.images[0] && <img src={b.images[0]} alt={b.name} className="aspect-[4/3] w-full rounded-2xl object-cover" />}
          <dl className="card divide-y divide-cream/10">{facts.filter(([, v]) => v).map(([k, v]) => <div key={k} className="flex justify-between gap-4 py-2"><dt className="text-cream/60">{k}</dt><dd className="text-right">{v}</dd></div>)}</dl>
          {b.certifications && <div className="card"><p className="label">Certificazioni e tracciabilità</p><p>{b.certifications}</p>{!b.certVerified && <p className="mt-2 text-xs text-cream/50">In attesa di verifica documentale.</p>}</div>}
        </div>
      </div>
      {b.body && <div className="mt-16 max-w-3xl space-y-4 text-lg leading-relaxed text-cream/80">{b.body.split("\n\n").map((p, i) => <p key={i}>{p}</p>)}</div>}
      {b.videoUrl && <video src={b.videoUrl} controls className="mt-12 w-full rounded-2xl" />}
      {!!b.cuts.length && <section className="mt-16"><h2 className="text-2xl">Tagli associati</h2><div className="mt-4 flex flex-wrap gap-3">{b.cuts.map(({ cut }) => <Link key={cut.id} href={`/carne/tagli/${cut.slug}`} className="rounded-full border border-gold/40 px-4 py-2 hover:bg-gold hover:text-ink">{cut.name}</Link>)}</div></section>}
      {!!b.products.length && <section className="mt-12"><h2 className="text-2xl">Nel nostro menu</h2><ul className="mt-4 divide-y divide-cream/10">{b.products.map(p => <li key={p.id} className="flex justify-between py-3"><span>{p.name}</span><span className="text-gold">{priceLabel(p.priceMode as PriceMode, p.priceCents)}</span></li>)}</ul></section>}
    </article>);
}
