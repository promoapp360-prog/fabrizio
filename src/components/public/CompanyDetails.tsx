import ServerTranslated from "@/components/public/ServerTranslated";

const company = {
  name: "TOLDO SRL",
  street: "VIA XX SETTEMBRE 14 g",
  city: "75100 MATERA",
  vat: "01377160773",
};

export default function CompanyDetails({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <ServerTranslated>
        <p className="flex flex-wrap justify-center gap-x-1.5 text-[10px] leading-relaxed text-cream/50 md:text-xs">
          <span className="text-cream/70">Dati societari</span>
          <span aria-hidden="true">·</span>
          <span>{company.name}</span>
          <span aria-hidden="true">·</span>
          <span>Sede legale:</span>
          <span>{company.street}</span>
          <span>,</span>
          <span>{company.city}</span>
          <span aria-hidden="true">·</span>
          <span>P. IVA:</span>
          <span>{company.vat}</span>
        </p>
      </ServerTranslated>
    );
  }

  return (
    <ServerTranslated>
      <section
        aria-labelledby="company-details-title"
        className="mb-8 rounded-xl border border-cream/10 bg-coal/50 p-5"
      >
        <h2 id="company-details-title" className="mb-4 text-xs uppercase tracking-[0.2em] text-gold">
          Dati societari
        </h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-cream/50">Ragione sociale</dt>
            <dd className="mt-1 text-cream">{company.name}</dd>
          </div>
          <div>
            <dt className="text-cream/50">Sede legale</dt>
            <dd className="mt-1 text-cream">
              {company.street}
              <br />
              {company.city}
            </dd>
          </div>
          <div>
            <dt className="text-cream/50">P. IVA</dt>
            <dd className="mt-1 text-cream">{company.vat}</dd>
          </div>
        </dl>
      </section>
    </ServerTranslated>
  );
}
