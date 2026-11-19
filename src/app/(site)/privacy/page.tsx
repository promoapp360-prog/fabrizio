import { db } from "@/lib/db";
export const metadata = { title: "Privacy" };
// Testo modificabile da Admin › Contenuti (pagina "privacy", sezione richtext).
export default async function P() {
  const page = await db.page.findUnique({ where: { slug: "privacy" }, include: { sections: { where: { enabled: true }, orderBy: { position: "asc" } } } });
  return (<article className="mx-auto max-w-3xl px-4 py-20"><h1 className="text-4xl">{page?.title ?? "privacy"}</h1>
    {page?.sections.map(s => <div key={s.id} className="mt-6 whitespace-pre-line leading-relaxed text-cream/80">{String((s.content as Record<string, unknown>).body ?? "")}</div>)}</article>);
}
