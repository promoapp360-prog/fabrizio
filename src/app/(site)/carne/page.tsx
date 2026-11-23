import Translated from "@/components/public/ServerTranslated";
import Link from "next/link";
import { db } from "@/lib/db";
import CowMap from "@/components/public/CowMap";
import { createPageMetadata } from "@/lib/page-metadata";
export const generateMetadata = () => createPageMetadata({
  title: "Carni alla brace a Matera: razze e tagli",
  description: "Scopri razze, tagli e caratteristiche delle carni presentate da Vecciarì, ristorante alla brace in Via XX Settembre 14 a Matera.",
  path: "/carne",
});

export default async function Carne() {
  const [breeds, cuts, farming] = await Promise.all([
    db.breed.findMany({ where: { published: true }, orderBy: { position: "asc" }, include: { farmingMethod: true } }),
    db.cut.findMany({ where: { published: true }, orderBy: { position: "asc" } }),
    db.farmingMethod.findMany({ orderBy: { name: "asc" } }),
  ]);
  return <Translated>{(<>
    <section className="relative overflow-hidden px-4 py-28 text-center">
      <img src="/brand/fiamma-oro.webp" alt="" className="pointer-events-none absolute left-1/2 top-1/2 h-[140%] -translate-x-1/2 -translate-y-1/2 opacity-[.06]" />
      <p className="text-xs uppercase tracking-[0.4em] text-gold">Cultura della carne</p>
      <h1 className="mx-auto mt-4 max-w-4xl text-5xl md:text-7xl">Il mondo della <span className="gold-text">carne</span></h1>
      <nav className="mt-10 flex flex-wrap justify-center gap-3" aria-label="Sezioni"><a href="#razze" className="btn-ghost">Razze</a><a href="#allevamento" className="btn-ghost">Allevamento</a><a href="#atlante" className="btn-ghost">Atlante dei tagli</a></nav>
    </section>

    <section id="razze" className="mx-auto max-w-7xl px-4 py-16"><h2 className="text-3xl md:text-5xl">Razze e selezioni</h2>
      <p className="mt-3 max-w-2xl text-cream/60">Schede informative. La disponibilità effettiva è indicata solo quando confermata dal ristorante.</p>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{breeds.map(b => (
        <Link key={b.id} href={`/carne/razze/${b.slug}`} className="card group hover:border-gold/60">
          <div className="flex items-start justify-between"><h3 className="text-2xl group-hover:text-gold">{b.name}</h3></div>
          <p className="text-sm text-cream/60">{[b.type, b.country].filter(Boolean).join(" · ")}</p>
          <p className="mt-3 line-clamp-3 text-cream/80">{b.tasting}</p>
          <p className={`mt-4 text-xs uppercase tracking-widest ${b.available ? "text-gold" : "text-cream/40"}`}>{b.available ? "Disponibile" : "Disponibilità su richiesta"}</p>
        </Link>))}</div>
    </section>

    <section id="allevamento" className="bg-coal py-20"><div className="mx-auto max-w-7xl px-4"><h2 className="text-3xl md:text-5xl">Tipologie di allevamento</h2>
      <div className="mt-10 grid gap-5 md:grid-cols-3">{farming.map(f => <article key={f.id} className="rounded-2xl border border-gold/20 p-6"><h3 className="text-xl text-gold">{f.name}</h3><p className="mt-3 text-cream/80">{f.description}</p></article>)}</div>
    </div></section>

    <section id="atlante" className="mx-auto max-w-7xl px-4 py-20"><h2 className="text-3xl md:text-5xl">Atlante dei tagli</h2>
      <p className="mt-3 text-cream/60">Seleziona una zona dell&apos;animale per scoprirne i tagli.</p>
      <div className="mt-10"><CowMap cuts={cuts.map(c => ({ slug: c.slug, name: c.name, zone: c.zone }))} /></div>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cuts.map(c => (
        <Link key={c.id} href={`/carne/tagli/${c.slug}`} className="card hover:border-gold/60"><h3 className="text-lg">{c.name}</h3><p className="text-sm text-cream/60">{c.anatomy}</p></Link>))}</div>
    </section>
  </>)}</Translated>;
}
