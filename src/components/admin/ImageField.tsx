"use client";
import { useState } from "react";
import { uploadMedia } from "@/lib/upload-client";

export default function ImageField({ value, onChange }: { value: string[]; onChange: (images: string[]) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true); setError("");
    const urls = [...value];
    try { for (const file of Array.from(files)) { const media = await uploadMedia(file); urls.push(media.url); } }
    catch (e) { setError(e instanceof Error ? e.message : "Caricamento non riuscito"); }
    finally { onChange(urls); setBusy(false); }
  }
  return <div className="space-y-3" data-uploading={busy}>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{value.map((src, i) => <div key={`${src}-${i}`} className="overflow-hidden rounded-lg border border-cream/15">
      <img src={src} alt={`Foto ${i + 1}`} className="aspect-[4/3] w-full object-cover" />
      <div className="flex flex-wrap justify-between gap-1 p-2 text-xs">
        <button type="button" disabled={busy} className="text-gold" onClick={() => onChange([src, ...value.filter((_, n) => n !== i)])}>In copertina</button>
        <button type="button" disabled={busy} className="text-red-300" onClick={() => onChange(value.filter((_, n) => n !== i))}>Rimuovi foto</button>
      </div></div>)}</div>
    <label className="block rounded-lg border border-dashed border-gold/40 p-3 text-sm">
      {busy ? "Caricamento foto…" : "Carica / sostituisci foto · JPG, PNG, WebP, AVIF · max 15 MB"}
      <input className="mt-2 block w-full text-xs" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple disabled={busy} onChange={e => { void upload(e.target.files); e.target.value = ""; }} />
    </label>
    <div className="flex gap-2"><input className="input min-w-0 text-xs" aria-label="URL immagine" placeholder="Oppure incolla l'URL di una foto" value={url} onChange={e => setUrl(e.target.value)} />
      <button className="text-sm text-gold" type="button" disabled={busy || !url.trim()} onClick={() => { onChange([...value, url.trim()]); setUrl(""); }}>Aggiungi</button></div>
    <p className="text-xs text-cream/50">Per sostituire una foto, carica quella nuova e rimuovi la precedente. Salva il piatto per confermare.</p>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
  </div>;
}
