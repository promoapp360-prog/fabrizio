"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/components/admin/ResourceManager";
import { uploadMedia } from "@/lib/upload-client";
/* eslint-disable @typescript-eslint/no-explicit-any */
const TYPES: Record<string, { label: string; fields: [string, string, ("text" | "textarea" | "reviews")?][] }> = {
  hero: { label: "Hero iniziale", fields: [["title", "Titolo"], ["subtitle", "Località"], ["image", "Immagine desktop (URL)"], ["mobileImage", "Immagine smartphone (URL)"], ["video", "Video sfondo (URL, opzionale)"]] },
  philosophy: { label: "Filosofia", fields: [["eyebrow", "Occhiello"], ["title", "Titolo"], ["body", "Testo (paragrafi separati da riga vuota)", "textarea"]] },
  quality: { label: "Qualità e provenienza", fields: [["eyebrow", "Occhiello"], ["title", "Titolo"], ["body", "Testo", "textarea"]] },
  richtext: { label: "Testo libero", fields: [["eyebrow", "Occhiello"], ["title", "Titolo"], ["body", "Testo", "textarea"]] },
  meats: { label: "Anteprima carni", fields: [["eyebrow", "Occhiello"], ["title", "Titolo"]] },
  cuts: { label: "Selezione tagli", fields: [["eyebrow", "Occhiello"], ["title", "Titolo"]] },
  menuPreview: { label: "Anteprima menu", fields: [["eyebrow", "Occhiello"], ["title", "Titolo"]] },
  gallery: { label: "Galleria", fields: [["gallery", "Nome galleria (es. home)"]] },
  reviews: { label: "Recensioni autentiche", fields: [["items", "Recensioni", "reviews"]] },
  contacts: { label: "Orari e contatti", fields: [["title", "Titolo"]] },
};

export default function Contenuti({ storage }: { storage: boolean }) {
  const [pages, setPages] = useState<any[]>([]); const [slug, setSlug] = useState("home"); const [sections, setSections] = useState<any[]>([]);
  const [edit, setEdit] = useState<any | null>(null); const [media, setMedia] = useState<any[]>([]); const [msg, setMsg] = useState("");
  const load = useCallback(async () => {
    const [p, s, m] = await Promise.all([api("/api/admin/r/pages"), api("/api/admin/r/sections"), api("/api/admin/r/media")]);
    setPages(p); setMedia(m); const page = p.find((x: any) => x.slug === slug); setSections(s.filter((x: any) => x.pageId === page?.id));
  }, [slug]);
  useEffect(() => { load(); }, [load]);
  const page = pages.find(p => p.slug === slug);
  const patch = async (id: string, d: any) => { await api(`/api/admin/r/sections/${id}`, "PATCH", d); load(); };
  const swap = async (i: number, j: number) => { const a = sections[i], b = sections[j]; if (!b) return; await patch(a.id, { position: b.position }); await patch(b.id, { position: a.position }); };
  const add = async (type: string) => { await api("/api/admin/r/sections", "POST", { pageId: page.id, type, position: (sections.at(-1)?.position ?? 0) + 1, enabled: false, content: {} }); load(); };
  async function upload(files: FileList | null, gallery: string) {
    if (!files?.length) return;
    try { for (const file of Array.from(files)) await uploadMedia(file, gallery); setMsg(`${files.length} file caricati`); await load(); }
    catch (e) { setMsg(e instanceof Error ? e.message : "Caricamento non riuscito"); }
  }
  const previewPath = slug === "home" ? "/" : `/${slug}`;

  return (<div>
    <h1 className="text-3xl">Contenuti del sito</h1>
    <div className="mt-4 flex flex-wrap gap-2">{pages.map(p => <button key={p.id} onClick={() => setSlug(p.slug)} className={`rounded-full px-4 py-2 text-sm ${slug === p.slug ? "bg-gold text-ink" : "border border-cream/20"}`}>{p.title}</button>)}</div>
    {page && <div className="mt-4 grid gap-3 md:grid-cols-2"><label><span className="label">Titolo SEO</span><input className="input" defaultValue={page.seoTitle ?? ""} onBlur={e => api(`/api/admin/r/pages/${page.id}`, "PATCH", { seoTitle: e.target.value })} /></label>
      <label><span className="label">Descrizione SEO</span><input className="input" defaultValue={page.seoDesc ?? ""} onBlur={e => api(`/api/admin/r/pages/${page.id}`, "PATCH", { seoDesc: e.target.value })} /></label></div>}
    <div className="mt-6 flex items-center justify-between"><h2 className="text-xl">Sezioni</h2><a href={`${previewPath}?preview=1`} target="_blank" className="btn-ghost !py-2 text-sm">Anteprima bozze ↗</a></div>
    <ul className="mt-3 space-y-2">{sections.map((s, i) => (
      <li key={s.id} className="card flex flex-wrap items-center justify-between gap-3 !p-3">
        <div><b>{TYPES[s.type]?.label ?? s.type}</b> <span className="text-xs text-cream/50">{s.content?.title}</span> {s.draft && <span className="demo-badge">Bozza non pubblicata</span>}</div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <button onClick={() => swap(i, i - 1)} aria-label="Su">↑</button><button onClick={() => swap(i, i + 1)} aria-label="Giù">↓</button>
          <label className="flex items-center gap-1"><input type="checkbox" checked={s.enabled} onChange={e => patch(s.id, { enabled: e.target.checked })} /> Visibile</label>
          <button className="text-gold underline" onClick={() => setEdit({ ...s, form: { ...(s.draft ?? s.content) } })}>Modifica</button>
          {s.draft && <button className="underline" onClick={() => patch(s.id, { content: s.draft, draft: null })}>Pubblica</button>}
          <button className="text-red-400 underline" onClick={async () => { if (confirm("Eliminare la sezione?")) { await api(`/api/admin/r/sections/${s.id}`, "DELETE"); load(); } }}>Elimina</button>
        </div></li>))}</ul>
    <div className="mt-3 flex items-center gap-2"><select id="newsec" className="input !w-60">{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select><button className="btn-ghost !py-2 text-sm" onClick={() => add((document.getElementById("newsec") as HTMLSelectElement).value)}>+ Aggiungi sezione</button></div>

    <h2 className="mt-12 text-xl">Media e gallerie</h2>
    {!storage ? <p className="mt-2 rounded border border-gold/30 p-3 text-sm">Archivio immagini non configurato. Puoi comunque incollare URL di immagini già online.</p>
      : <div className="mt-3 flex items-center gap-2"><input id="gal" className="input !w-48" defaultValue="home" aria-label="Galleria" /><input type="file" multiple accept="image/*,video/mp4" onChange={e => upload(e.target.files, (document.getElementById("gal") as HTMLInputElement).value)} /></div>}
    {msg && <p className="mt-2 text-sm text-gold">{msg}</p>}
    <div className="mt-4 grid grid-cols-3 gap-3 md:grid-cols-6">{media.map(m => <figure key={m.id} className="text-xs"><img src={m.url} alt={m.alt} className="aspect-square w-full rounded object-cover" />
      <figcaption className="mt-1 truncate">{m.gallery} · <button className="underline" onClick={() => navigator.clipboard.writeText(m.url)}>copia URL</button> · <button aria-label="Elimina dalla libreria" className="text-red-400 underline" onClick={async () => { if (!confirm("Eliminare questa foto dalla libreria?")) return; try { await api(`/api/admin/r/media/${m.id}`, "DELETE"); load(); } catch (e) { setMsg(e instanceof Error ? e.message : "Eliminazione non riuscita"); } }}>×</button></figcaption>
      <input className="input mt-1 !py-1 text-xs" placeholder="Testo alternativo" defaultValue={m.alt} onBlur={e => api(`/api/admin/r/media/${m.id}`, "PATCH", { alt: e.target.value })} /></figure>)}</div>

    {edit && <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={() => setEdit(null)}><div className="h-full w-full max-w-xl overflow-y-auto bg-coal p-6" onClick={e => e.stopPropagation()}>
      <h2 className="text-2xl">{TYPES[edit.type]?.label}</h2>
      <div className="mt-4 space-y-4">{TYPES[edit.type]?.fields.map(([k, l, t]) => <label key={k} className="block"><span className="label">{l}</span>
        {t === "textarea" ? <textarea className="input" rows={8} value={edit.form[k] ?? ""} onChange={e => setEdit({ ...edit, form: { ...edit.form, [k]: e.target.value } })} />
          : t === "reviews" ? <Reviews v={edit.form[k] ?? []} set={v => setEdit({ ...edit, form: { ...edit.form, [k]: v } })} />
          : <input className="input" value={edit.form[k] ?? ""} onChange={e => setEdit({ ...edit, form: { ...edit.form, [k]: e.target.value } })} />}</label>)}</div>
      <div className="mt-6 flex flex-wrap gap-3">
        <button className="btn-ghost" onClick={async () => { await patch(edit.id, { draft: edit.form }); setEdit(null); }}>Salva bozza</button>
        <button className="btn-gold" onClick={async () => { await patch(edit.id, { content: edit.form, draft: null }); setEdit(null); }}>Pubblica</button>
        <button className="btn" onClick={() => setEdit(null)}>Annulla</button></div>
    </div></div>}
  </div>);
}
function Reviews({ v, set }: { v: any[]; set: (v: any[]) => void }) {
  return <div className="space-y-2">{v.map((r, i) => <div key={i} className="rounded border border-cream/10 p-2">
    <input className="input mb-1" placeholder="Autore" value={r.author} onChange={e => set(v.map((x, j) => j === i ? { ...x, author: e.target.value } : x))} />
    <input className="input mb-1" placeholder="Fonte (es. Google)" value={r.source ?? ""} onChange={e => set(v.map((x, j) => j === i ? { ...x, source: e.target.value } : x))} />
    <textarea className="input" placeholder="Testo della recensione reale" value={r.text} onChange={e => set(v.map((x, j) => j === i ? { ...x, text: e.target.value } : x))} />
    <button type="button" className="text-xs text-red-400 underline" onClick={() => set(v.filter((_, j) => j !== i))}>Rimuovi</button></div>)}
    <button type="button" className="text-sm text-gold underline" onClick={() => set([...v, { author: "", text: "" }])}>+ Recensione</button>
    <p className="text-xs text-cream/50">Inserisci solo recensioni reali, riportandone la fonte.</p></div>;
}
