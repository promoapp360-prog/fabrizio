"use client";
import { useEffect, useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Field = {
  name: string; label: string; type?: "text" | "textarea" | "number" | "money" | "bool" | "select" | "multiselect" | "tags" | "date" | "datetime" | "json" | "images" | "weekdays";
  options?: { value: string; label: string }[]; required?: boolean; help?: string; full?: boolean;
};
type Props = { resource: string; title: string; fields: Field[]; columns: { key: string; label: string; render?: (r: any) => React.ReactNode }[]; defaults?: Record<string, any>;
  toForm?: (row: any) => Record<string, any>; canDuplicate?: boolean; extraActions?: (row: any, reload: () => void) => React.ReactNode };

export async function api(url: string, method = "GET", body?: unknown) {
  const r = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const j = r.headers.get("content-type")?.includes("json") ? await r.json() : null;
  if (!r.ok) throw new Error(j?.error ?? `Errore ${r.status}`);
  return j;
}

const WD = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

export function FieldInput({ f, v, set }: { f: Field; v: any; set: (v: any) => void }) {
  switch (f.type) {
    case "textarea": return <textarea className="input" rows={4} value={v ?? ""} onChange={e => set(e.target.value)} />;
    case "number": return <input className="input" type="number" value={v ?? ""} onChange={e => set(e.target.value === "" ? null : Number(e.target.value))} />;
    case "money": return <input className="input" type="number" step="0.01" min="0" value={v == null ? "" : v / 100} onChange={e => set(e.target.value === "" ? null : Math.round(Number(e.target.value) * 100))} />;
    case "bool": return <input type="checkbox" className="h-5 w-5" checked={!!v} onChange={e => set(e.target.checked)} />;
    case "select": return <select className="input" value={v ?? ""} onChange={e => set(e.target.value || null)}><option value="">—</option>{f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>;
    case "multiselect": return <div className="flex flex-wrap gap-2">{f.options?.map(o => { const on = (v ?? []).includes(o.value); return <button type="button" key={o.value} onClick={() => set(on ? v.filter((x: string) => x !== o.value) : [...(v ?? []), o.value])} className={`rounded-full px-3 py-1 text-xs ${on ? "bg-gold text-ink" : "border border-cream/20"}`}>{o.label}</button>; })}</div>;
    case "weekdays": return <div className="flex gap-1">{WD.map((d, i) => { const on = (v ?? []).includes(i); return <button type="button" key={i} onClick={() => set(on ? v.filter((x: number) => x !== i) : [...(v ?? []), i].sort())} className={`rounded px-2 py-1 text-xs ${on ? "bg-gold text-ink" : "border border-cream/20"}`}>{d}</button>; })}</div>;
    case "tags": case "images": return <textarea className="input font-mono text-xs" rows={2} placeholder="Un valore per riga" value={(v ?? []).join("\n")} onChange={e => set(e.target.value.split("\n").map(s => s.trim()).filter(Boolean))} />;
    case "date": return <input className="input" type="date" value={v ? String(v).slice(0, 10) : ""} onChange={e => set(e.target.value)} />;
    case "datetime": return <input className="input" type="datetime-local" value={v ? new Date(v).toISOString().slice(0, 16) : ""} onChange={e => set(new Date(e.target.value).toISOString())} />;
    case "json": return <textarea className="input font-mono text-xs" rows={8} defaultValue={JSON.stringify(v ?? {}, null, 2)} onBlur={e => { try { set(JSON.parse(e.target.value)); } catch { alert("JSON non valido"); } }} />;
    default: return <input className="input" value={v ?? ""} required={f.required} onChange={e => set(e.target.value)} />;
  }
}

export default function ResourceManager({ resource, title, fields, columns, defaults = {}, toForm, canDuplicate, extraActions }: Props) {
  const [rows, setRows] = useState<any[] | null>(null); const [edit, setEdit] = useState<{ id?: string; data: Record<string, any> } | null>(null);
  const [err, setErr] = useState(""); const [q, setQ] = useState("");
  const base = `/api/admin/r/${resource}`;
  const load = () => api(base).then(setRows).catch(e => setErr(e.message));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (row: any) => { const d = toForm ? toForm(row) : row; return Object.fromEntries(fields.map(f => [f.name, d[f.name]])); };
  async function save(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    try { await api(edit!.id ? `${base}/${edit!.id}` : base, edit!.id ? "PATCH" : "POST", edit!.data); setEdit(null); load(); } catch (e: any) { setErr(e.message); }
  }
  async function del(id: string) { if (!confirm("Eliminare definitivamente?")) return; try { const r = await api(`${base}/${id}`, "DELETE"); if (r?.deactivated) alert("Il prodotto ha ordini nello storico: è stato disattivato invece che eliminato."); load(); } catch (e: any) { setErr(e.message); } }
  async function dup(row: any) { const d = pick(row); d.name = `${d.name} (copia)`; if ("slug" in d) d.slug = `${d.slug}-copia-${Date.now().toString(36)}`; try { await api(base, "POST", d); load(); } catch (e: any) { setErr(e.message); } }

  const shown = rows?.filter(r => !q || JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl">{title}</h1>
        <div className="flex gap-2"><input className="input !w-56" placeholder="Cerca…" value={q} onChange={e => setQ(e.target.value)} /><button className="btn-gold !py-2" onClick={() => setEdit({ data: { ...defaults } })}>+ Nuovo</button></div></div>
      {err && <p role="alert" className="mt-4 rounded bg-red-900/50 p-3 text-sm">{err}</p>}
      {!shown ? <p className="mt-6 text-cream/50">Caricamento…</p> : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-cream/10"><table className="w-full text-sm">
          <thead className="bg-coal text-left text-xs uppercase tracking-wider text-cream/60"><tr>{columns.map(c => <th key={c.key} className="p-3">{c.label}</th>)}<th className="p-3" /></tr></thead>
          <tbody>{shown.map(r => (
            <tr key={r.id} className="border-t border-cream/5 hover:bg-coal/60">{columns.map(c => <td key={c.key} className="p-3">{c.render ? c.render(r) : String(r[c.key] ?? "")}</td>)}
              <td className="whitespace-nowrap p-3 text-right">{extraActions?.(r, load)}
                <button className="ml-3 text-gold hover:underline" onClick={() => setEdit({ id: r.id, data: pick(r) })}>Modifica</button>
                {canDuplicate && <button className="ml-3 text-cream/70 hover:underline" onClick={() => dup(r)}>Duplica</button>}
                <button className="ml-3 text-red-400 hover:underline" onClick={() => del(r.id)}>Elimina</button></td></tr>))}
            {!shown.length && <tr><td colSpan={columns.length + 1} className="p-6 text-center text-cream/50">Nessun elemento</td></tr>}</tbody></table></div>)}
      {edit && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={() => setEdit(null)}>
          <form onSubmit={save} onClick={e => e.stopPropagation()} className="h-full w-full max-w-2xl overflow-y-auto bg-coal p-6">
            <div className="flex items-center justify-between"><h2 className="text-2xl">{edit.id ? "Modifica" : "Nuovo"}</h2><button type="button" onClick={() => setEdit(null)} className="text-2xl" aria-label="Chiudi">×</button></div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">{fields.map(f => (
              <label key={f.name} className={f.full || ["textarea", "json", "multiselect", "images", "tags"].includes(f.type ?? "") ? "sm:col-span-2" : ""}>
                <span className="label">{f.label}{f.required && " *"}</span>
                <FieldInput f={f} v={edit.data[f.name]} set={v => setEdit({ ...edit, data: { ...edit.data, [f.name]: v } })} />
                {f.help && <span className="mt-1 block text-xs text-cream/50">{f.help}</span>}
              </label>))}</div>
            {err && <p role="alert" className="mt-4 rounded bg-red-900/50 p-3 text-sm">{err}</p>}
            <div className="mt-6 flex gap-3"><button className="btn-gold">Salva</button><button type="button" className="btn-ghost" onClick={() => setEdit(null)}>Annulla</button></div>
          </form>
        </div>)}
    </div>);
}
