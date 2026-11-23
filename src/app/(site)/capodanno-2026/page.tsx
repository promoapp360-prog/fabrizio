import type { Metadata } from "next";
import Link from "next/link";
import Translated from "@/components/public/ServerTranslated";
import { NEW_YEAR_EVENT, newYearMenu } from "@/lib/new-year-event";

const title = "Cena con delitto · 31 dicembre 2026 · Vecciarì, Matera";
const description = "Il 31 dicembre 2026 festeggia da Vecciarì a Matera: cena con delitto, menù di fine anno a 60 € a persona e 100 posti totali. Informazioni e prenotazioni su VivoEventi.";
export const metadata: Metadata = {
  title, description,
  alternates: { canonical: NEW_YEAR_EVENT.path },
  openGraph: { title, description, type: "website", url: NEW_YEAR_EVENT.path },
};

export default function Capodanno() {
  return <Translated>{(
    <article className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[540px] bg-[radial-gradient(ellipse_at_top,rgba(233,194,58,0.10),transparent_70%)]" />
      <header className="mx-auto max-w-3xl px-5 pb-12 pt-14 text-center md:pb-16 md:pt-20">
        <Link href="/" className="text-xs text-cream/60 underline-offset-4 hover:text-gold hover:underline">Torna alla home</Link>
        <p className="mt-9 text-xs uppercase tracking-[.25em] text-gold"><time dateTime={NEW_YEAR_EVENT.date}>31 dicembre 2026</time></p>
        <h1 className="mt-5 text-4xl leading-tight md:text-6xl">Cena con delitto da Vecciarì</h1>
        <p className="mt-5 text-base text-cream/75 md:text-lg">Una cena di fine anno tra gusto e mistero, nel cuore di Matera.</p>
        <div className="mx-auto mt-8 flex max-w-sm flex-wrap items-center justify-center gap-x-6 gap-y-3 border-y border-gold/25 py-5">
          <p className="text-xl text-gold">60 € a persona</p>
          <p className="text-sm text-cream/75">100 posti totali</p>
        </div>
        <a href={NEW_YEAR_EVENT.contactUrl} target="_blank" rel="noopener noreferrer" className="btn-gold mt-8 max-w-full text-center text-sm">
          Informazioni e prenotazioni su VivoEventi <span aria-hidden="true">↗</span>
        </a>
        <p className="mt-3 text-xs leading-relaxed text-cream/60">Per questa serata contatta direttamente VivoEventi.</p>
      </header>
      <section aria-labelledby="event-menu-heading" className="mx-auto max-w-4xl px-5 pb-16 md:pb-24">
        <p className="text-center text-xs uppercase tracking-[.3em] text-gold">La cena di fine anno</p>
        <h2 id="event-menu-heading" className="mb-10 mt-3 text-center text-3xl md:text-4xl">Il menù della serata</h2>
        <div className="grid gap-x-12 md:grid-cols-2">
          {newYearMenu.map(section => (
            <section key={section.title} className="border-t border-gold/25 py-7">
              <h3 className="text-lg tracking-wide text-gold">{section.title}</h3>
              <ul className="mt-4 space-y-3 text-base leading-relaxed text-cream/85">
                {section.dishes.map(dish => <li key={dish}>{dish}</li>)}
              </ul>
            </section>
          ))}
        </div>
        <aside className="mt-5 rounded-xl border border-gold/25 bg-coal px-5 py-5 text-center">
          <p className="text-sm text-cream/85">Comunicare eventuali allergie.</p>
        </aside>
        <div className="mt-12 text-center">
          <p className="mb-5 text-sm text-cream/70">Vecciarì · Via XX Settembre 14, Matera</p>
          <a href={NEW_YEAR_EVENT.contactUrl} target="_blank" rel="noopener noreferrer" className="btn-gold max-w-full text-sm">
            Informazioni e prenotazioni su VivoEventi <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>
    </article>
  )}</Translated>;
}
