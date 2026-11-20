import Link from "next/link";

export const metadata = {
  title: "Le origini di Vecciarì, storia e tradizione a Matera",
  description:
    "Il nome Vecciarì richiama le antiche macellerie materane e la tradizione di Via delle Beccherie: una storia che continua a tavola.",
  openGraph: {
    title: "Le origini di Vecciarì, storia e tradizione a Matera",
    description:
      "Un nome antico, una storia che continua. Scopri le radici materane di Vecciarì — Grano & Brace.",
    type: "article",
  },
};

export default function Storia() {
  return (
    <>
      <section className="relative overflow-hidden px-4 py-20 text-center md:py-28">
        <img
          src="/brand/fiamma-oro.webp"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-[130%] -translate-x-1/2 -translate-y-1/2 opacity-[.045]"
        />
        <div className="relative mx-auto max-w-4xl">
          <p className="text-xs uppercase tracking-[0.35em] text-gold md:text-sm">
            Le origini di un nome, la storia di una tradizione
          </p>
          <h1 className="mt-5 text-5xl md:text-7xl">VECCIARÌ</h1>
          <p className="mt-5 font-display text-xl text-gold md:text-2xl">
            Un nome antico, una storia che continua.
          </p>
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-5 pb-20 md:px-8 md:pb-28">
        <div className="space-y-7 border-l border-gold/40 pl-5 text-base leading-8 text-cream/80 md:space-y-8 md:pl-8 md:text-lg md:leading-9">
          <p>
            Il nome Vecciarì affonda le sue radici nella tradizione popolare
            materana e richiama il termine dialettale vëccërië, utilizzato per
            indicare le antiche macellerie.
          </p>

          <p>
            Un tempo, nel cuore di Matera, lungo quella che ancora oggi è
            conosciuta come Via delle Beccherie, si concentravano le botteghe
            dei macellai, custodi di un mestiere fatto di esperienza, abilità e
            profonda conoscenza della carne.
          </p>

          <p>
            Erano luoghi di lavoro, ma anche di incontro, dove la scelta dei
            tagli, il profumo della carne arrostita e il calore dei fornelli
            facevano parte della vita quotidiana della città.
          </p>

          <p>
            Vecciarì nasce per rendere omaggio a quella tradizione,
            reinterpretandola attraverso una cucina contemporanea che mette al
            centro la qualità della materia prima, la selezione delle carni e
            il rispetto delle tecniche di preparazione.
          </p>

          <p>
            Un nome che custodisce la memoria di Matera e racconta la nostra
            filosofia: valorizzare la carne, conoscerne le origini ed esaltarne
            ogni sapore.
          </p>
        </div>

        <blockquote className="mt-12 border-t border-gold/30 pt-8 text-center md:mt-16">
          <p className="font-display text-2xl uppercase leading-snug text-gold md:text-4xl">
            VECCIARÌ — La carne ha una storia. Noi la portiamo a tavola.
          </p>
        </blockquote>

        <nav className="mt-10 flex flex-wrap justify-center gap-3" aria-label="Scopri Vecciarì">
          <Link href="/menu" className="btn-ghost">
            Scopri il menu
          </Link>
          <Link href="/prenota" className="btn-gold">
            Prenota un tavolo
          </Link>
        </nav>
      </article>
    </>
  );
}
