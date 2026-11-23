import Translated from "@/components/public/ServerTranslated";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ZONES } from "@/lib/meat-zones";
import { loadMenu } from "@/lib/menu";
import { priceLabel, type PriceMode } from "@/lib/pricing";
import { createPageMetadata } from "@/lib/page-metadata";

export async function generateMetadata({ params: pendingParams }: { params: Promise<{ slug: string }> }) {
  const params = await pendingParams;
  const c = await db.cut.findUnique({ where: { slug: params.slug } });
  return createPageMetadata({
    title: c?.name ?? "Taglio di carne",
    description: c?.description ?? "Scopri razze, tagli e caratteristiche delle carni presentate da Vecciarì, ristorante alla brace in Via XX Settembre 14 a Matera.",
    path: `/carne/tagli/${encodeURIComponent(params.slug)}`,
    appendMatera: true,
  });
}

export default async function Taglio({ params: pendingParams }: { params: Promise<{ slug: string }> }) {
  const params = await pendingParams;
  const c = await db.cut.findUnique({ where: { slug: params.slug }, include: { breeds: { include: { breed: true } }, products: { where: { active: true } } } });
  if (!c || !c.published) notFound();
  const products = (await loadMenu()).products.filter(p => p.cut?.slug === c.slug);
  const zone = ZONES.find(z => z.id === c.zone);
  const rows: [string, string | null][] = [["Altri nomi", c.altNames], ["Posizione anatomica", c.anatomy ?? zone?.label ?? null], ["Sapore", c.flavour], ["Consistenza", c.texture], ["Cottura consigliata", c.cooking], ["Frollatura", c.ageing]];
  return <Translated>{(
    <article className="mx-auto max-w-5xl px-4 py-16">
      <Link href="/carne#atlante" className="text-sm text-gold">← Atlante dei tagli</Link>
      <h1 className="mt-2 text-5xl md:text-7xl">{c.name}</h1>
      <div className="mt-10 grid gap-10 md:grid-cols-2">
        <div><p className="text-lg leading-relaxed text-cream/80">{c.description}</p>
          {zone && <svg viewBox="100 60 640 300" className="mt-8 w-full" aria-label={`Posizione: ${zone.label}`}>{ZONES.map(z => <path key={z.id} d={z.d} fill={z.id === zone.id ? "rgb(var(--c-gold))" : "rgb(var(--c-coal))"} stroke="rgb(var(--c-gold) / .5)" />)}</svg>}
        </div>
        <div>{c.images[0] && <img src={c.images[0]} alt={c.name} className="mb-4 aspect-[8/3] w-full rounded-2xl object-cover" />}
          <dl className="card divide-y divide-cream/10">{rows.filter(([, v]) => v).map(([k, v]) => <div key={k} className="py-3"><dt className="label">{k}</dt><dd>{v}</dd></div>)}</dl></div>
      </div>
      {!!c.breeds.length && <section className="mt-12"><h2 className="text-2xl">Razze</h2><div className="mt-4 flex flex-wrap gap-3">{c.breeds.map(({ breed }) => <Link key={breed.id} href={`/carne/razze/${breed.slug}`} className="rounded-full border border-gold/40 px-4 py-2 hover:bg-gold hover:text-ink">{breed.name}</Link>)}</div></section>}
      {!!products.length && <section className="mt-12"><h2 className="text-2xl">Piatti con questo taglio</h2><ul className="mt-4 divide-y divide-cream/10">{products.map(p => <li key={p.id} className="flex justify-between gap-3 py-3"><span>{p.name}</span><span className="text-right text-gold">{p.pricePending ? "Prezzo da definire" : priceLabel(p.priceMode as PriceMode, p.priceCents)}</span></li>)}</ul></section>}
    </article>)}</Translated>;
}
