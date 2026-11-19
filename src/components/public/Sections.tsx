import Link from "next/link";
import { db } from "@/lib/db";
import { priceLabel, type PriceMode } from "@/lib/pricing";
import type { Settings } from "@/lib/settings";
import { loadMenu } from "@/lib/menu";
import { getMapsDirectionsUrl, getMapsEmbedUrl } from "@/lib/maps";

/* eslint-disable @typescript-eslint/no-explicit-any */
type C = Record<string, any>;
const Eyebrow = ({ children }: { children: React.ReactNode }) => <p className="mb-3 text-xs uppercase tracking-[0.35em] text-gold">{children}</p>;

export async function SectionRenderer({ type, c, s }: { type: string; c: C; s: Settings }) {
  switch (type) {
    case "hero": return (
      c.restaurantHome ? <section className="restaurant-hero relative overflow-hidden bg-ink text-center" aria-label="Vecciarì – Grano & Brace, Matera">
        <picture className="absolute inset-0">
          <source media="(min-width: 768px)" srcSet={c.image || "/api/media/assets/hero-desktop.png"} />
          <img src={c.mobileImage || "/api/media/assets/hero-mobile.png"} alt="Antica macelleria con banco di marmo bianco e tagli di carne sul ceppo in legno" fetchPriority="high" className="h-full w-full" />
        </picture>
        <div className="restaurant-hero-shade absolute inset-0" />
        <div className="restaurant-hero-content reveal relative z-10 mx-auto flex flex-col items-center px-5">
          <img src={s.brand.mark} alt="Simbolo originale Vecciarì: fiamma e spiga" className="hero-mark w-auto" />
          <h1 className="hero-name text-cream">{c.title || "VECCIARÍ"}</h1>
          <p className="hero-location uppercase text-cream">{c.subtitle || "MATERA"}</p>
          <div className="hero-actions flex flex-col justify-center">
            <Link href="/prenota" className="btn-gold">Prenota</Link>
            <Link href="/menu" className="btn-ghost !bg-ink/40 hover:!bg-ink/70 md:!border-cream/70 md:!text-cream">Scopri il menu</Link>
          </div>
        </div>
      </section> : <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden text-center">
        {c.video ? <video className="absolute inset-0 h-full w-full object-cover opacity-40" src={c.video} autoPlay muted loop playsInline />
          : <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url(${c.image || "/brand/texture-oro.webp"})` }} />}
        <div className="absolute inset-0 bg-gradient-to-b from-ink/30 via-ink/60 to-ink" />
        <div className="reveal relative z-10 px-4">
          <img src={s.brand.mark} alt={s.brand.name} className="mx-auto h-24 w-auto" />
          <p className="mt-6 font-display text-sm uppercase tracking-[0.4em] text-cream/80">{c.subtitle ?? s.brand.motto}</p>
          <h1 className="mx-auto mt-4 max-w-3xl text-4xl md:text-6xl">{c.title}</h1>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href="/prenota" className="btn-gold">Prenota</Link><Link href="/menu" className="btn-ghost">Scopri il menu</Link>
            {(s.ordering.takeawayEnabled || s.ordering.deliveryEnabled) && <Link href="/ordina" className="btn-ghost">Ordina</Link>}
          </div>
        </div>
      </section>);
    case "philosophy": case "quality": case "richtext": return (
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-24 md:grid-cols-2">
        <div><Eyebrow>{c.eyebrow}</Eyebrow><h2 className="text-3xl md:text-5xl">{c.title}</h2></div>
        <div className="space-y-4 text-lg leading-relaxed text-cream/80">{String(c.body ?? "").split("\n\n").map((p: string, i: number) => <p key={i}>{p}</p>)}</div>
      </section>);
    case "meats": {
      const breeds = await db.breed.findMany({ where: { published: true }, orderBy: { position: "asc" }, take: c.limit ?? 4 });
      return (
        <section className="bg-coal py-24"><div className="mx-auto max-w-7xl px-4">
          <Eyebrow>{c.eyebrow ?? "Selezioni"}</Eyebrow><h2 className="text-3xl md:text-5xl">{c.title ?? "Le nostre carni"}</h2>
          <p className="mt-3 max-w-2xl text-xs leading-relaxed text-cream/50">Immagini generate a scopo illustrativo; non attestano provenienza o disponibilità delle carni.</p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{breeds.map(b => (
            <Link key={b.id} href={`/carne/razze/${b.slug}`} className="group card relative overflow-hidden hover:border-gold/50">
              <div className="relative -m-5 mb-4 aspect-[8/5] overflow-hidden bg-ink">
                <img src={b.images[0] ?? "/brand/texture-oro.webp"} alt={`Immagine illustrativa del taglio ${b.name}`} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                <span className="absolute bottom-3 left-3 rounded bg-ink/75 px-2 py-1 text-[10px] uppercase tracking-wider text-cream/75">Immagine illustrativa</span>
              </div>
              <h3 className="mt-2 text-xl">{b.name}</h3><p className="text-sm text-cream/60">{[b.country, b.region].filter(Boolean).join(" · ")}</p>
            </Link>))}</div>
          <Link href="/carne" className="btn-ghost mt-10">Esplora il mondo della carne</Link>
        </div></section>);
    }
    case "cuts": {
      const cuts = await db.cut.findMany({ where: { published: true }, orderBy: { position: "asc" }, take: c.limit ?? 6 });
      return (
        <section className="mx-auto max-w-7xl px-4 py-24"><Eyebrow>{c.eyebrow ?? "Atlante"}</Eyebrow><h2 className="text-3xl md:text-5xl">{c.title ?? "I tagli"}</h2>
          <div className="mt-10 flex flex-wrap gap-3">{cuts.map(t => <Link key={t.id} href={`/carne/tagli/${t.slug}`} className="rounded-full border border-gold/40 px-5 py-2 font-display uppercase hover:bg-gold hover:text-ink">{t.name}</Link>)}</div>
        </section>);
    }
    case "menuPreview": {
      const items = (await loadMenu()).products.sort((a, b) => Number(b.specialty || b.recommended || b.dailySpecial) - Number(a.specialty || a.recommended || a.dailySpecial)).filter(p => p.dailySpecial || p.offMenu || p.specialty || p.recommended || p.available).slice(0, 6);
      return (
        <section className="bg-coal py-24"><div className="mx-auto max-w-5xl px-4">
          <Eyebrow>{c.eyebrow ?? "Dalla brace"}</Eyebrow><h2 className="text-3xl md:text-5xl">{c.title ?? "Assaggi dal menu"}</h2>
          <ul className="mt-10 divide-y divide-cream/10">{items.map(p => (
            <li key={p.id} className="flex items-baseline justify-between gap-4 py-4"><div><p className="font-display text-lg uppercase">{p.name}</p><p className="text-sm text-cream/60">{p.description}</p></div>
              <p className="shrink-0 text-right text-sm text-gold">{p.pricePending ? "Prezzo da definire" : priceLabel(p.priceMode as PriceMode, p.priceCents)}</p></li>))}</ul>
          <Link href="/menu" className="btn-gold mt-10">Menu completo</Link>
        </div></section>);
    }
    case "gallery": {
      const media = await db.media.findMany({ where: { gallery: c.gallery ?? "home" }, orderBy: { position: "asc" }, take: 12 });
      if (!media.length) return null;
      return (<section className="px-4 py-24"><div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 md:grid-cols-4">{media.map(m => <img key={m.id} src={m.url} alt={m.alt} loading="lazy" className="aspect-square w-full rounded-xl object-cover" />)}</div></section>);
    }
    case "reviews": {
      const list: { author: string; text: string; source?: string }[] = c.items ?? [];
      if (!list.length) return null; // solo recensioni autentiche inserite dall'admin
      return (<section className="mx-auto max-w-6xl px-4 py-24"><Eyebrow>Dicono di noi</Eyebrow>
        <div className="mt-8 grid gap-5 md:grid-cols-3">{list.map((r, i) => <blockquote key={i} className="card"><p className="text-cream/80">“{r.text}”</p><footer className="mt-4 text-sm text-gold">{r.author}{r.source && ` · ${r.source}`}</footer></blockquote>)}</div></section>);
    }
    case "contacts": return (
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-24 md:grid-cols-2">
        <div><Eyebrow>Vieni a trovarci</Eyebrow><h2 className="text-3xl md:text-5xl">{c.title ?? "Orari e contatti"}</h2>
          <p className="mt-6 text-cream/80">{s.contacts.address}</p><p className="mt-2 whitespace-pre-line text-cream/80">{s.contacts.hours}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {s.contacts.phone && <a className="btn-ghost" href={`tel:${s.contacts.phone.replace(/[^\d+]/g, "")}`}>Chiama per prenotare</a>}
            {s.contacts.whatsapp && <a className="btn-ghost" href={`https://wa.me/${s.contacts.whatsapp.replace(/\D/g, "")}`}>WhatsApp</a>}
            <a className="btn-ghost" href={getMapsDirectionsUrl(s.contacts.address, s.contacts.mapsUrl)} target="_blank" rel="noopener noreferrer">Come arrivare</a>
          </div></div>
        <iframe title="Mappa per raggiungere Vecciarì" src={getMapsEmbedUrl(s.contacts.address)} className="h-80 w-full rounded-2xl border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      </section>);
    default: return null;
  }
}

export async function PageSections({ slug, s, preview = false }: { slug: string; s: Settings; preview?: boolean }) {
  const page = await db.page.findUnique({ where: { slug }, include: { sections: { orderBy: { position: "asc" } } } });
  if (!page) return null;
  return <>{page.sections.filter(x => x.enabled).map(x => {
    const content = (preview && x.draft ? x.draft : x.content) as C;
    return <SectionRenderer key={x.id} type={x.type} c={content} s={s} />;
  })}</>;
}
