import Translated from "@/components/public/ServerTranslated";
import { db } from "@/lib/db";
import CompanyDetails from "@/components/public/CompanyDetails";
import { createPageMetadata } from "@/lib/page-metadata";
export const generateMetadata = () => createPageMetadata({
  title: "Privacy e dati personali",
  description: "Leggi l’informativa sul trattamento dei dati personali per prenotazioni, ordini e servizi del ristorante Vecciarì a Matera.",
  path: "/privacy",
});
// Testo modificabile da Admin › Contenuti (pagina "privacy", sezione richtext).
export default async function P() {
  const page = await db.page.findUnique({ where: { slug: "privacy" }, include: { sections: { where: { enabled: true }, orderBy: { position: "asc" } } } });
  return <Translated>{(<article className="mx-auto max-w-3xl px-4 py-20"><h1 className="mb-8 text-4xl">{page?.title ?? "privacy"}</h1><CompanyDetails />
    {page?.sections.map(s => <div key={s.id} className="mt-6 whitespace-pre-line leading-relaxed text-cream/80">{String((s.content as Record<string, unknown>).body ?? "")}</div>)}</article>)}</Translated>;
}
