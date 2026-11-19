"use client";
import { useEffect, useState } from "react";
import { api } from "@/components/admin/ResourceManager";
/* eslint-disable @typescript-eslint/no-explicit-any */
const R: Record<string, string> = { SUPER_ADMIN: "Super Admin", MANAGER: "Responsabile", WAITER: "Sala / Cameriere", KITCHEN: "Cucina" };
export default function Utenti() {
  const [users, setUsers] = useState<any[]>([]); const [f, setF] = useState<any | null>(null); const [err, setErr] = useState("");
  const load = () => api("/api/admin/users").then(setUsers);
  useEffect(() => { load(); }, []);
  async function save(e: React.FormEvent) { e.preventDefault(); setErr(""); try { await api("/api/admin/users", "POST", { ...f, password: f.password || undefined }); setF(null); load(); } catch (e: any) { setErr(e.message); } }
  return (<div>
    <div className="flex justify-between"><h1 className="text-3xl">Personale</h1><button className="btn-gold !py-2" onClick={() => setF({ name: "", role: "WAITER", active: true, password: "" })}>+ Nuovo membro</button></div>
    <p className="mt-2 text-sm text-cream/60">Ogni membro accede con la sola password, che deve essere diversa da quella degli altri. La lunghezza minima si imposta in Impostazioni › Sicurezza.</p>
    <table className="mt-6 w-full text-sm"><thead className="text-left text-xs uppercase text-cream/60"><tr><th className="p-2">Nome</th><th>Ruolo</th><th>Stato</th><th>Ultimo accesso</th><th /></tr></thead>
      <tbody>{users.map(u => <tr key={u.id} className="border-t border-cream/10"><td className="p-2">{u.name}</td><td>{R[u.role]}</td><td>{u.active ? "Attivo" : "Disattivato"}</td><td>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("it-IT") : "—"}</td>
        <td><button className="text-gold underline" onClick={() => { setErr(""); setF({ ...u, password: "" }); }}>Modifica / cambia password</button></td></tr>)}</tbody></table>
    {f && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setF(null)}><form onSubmit={save} onClick={e => e.stopPropagation()} className="card w-full max-w-md space-y-3">
      <h2 className="text-xl">{f.id ? "Modifica membro" : "Nuovo membro"}</h2>
      <input className="input" required placeholder="Nome" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
      <select className="input" value={f.role} onChange={e => setF({ ...f, role: e.target.value })}>{Object.entries(R).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      <input className="input" type="password" autoComplete="new-password" required={!f.id} placeholder={f.id ? "Nuova password (vuoto = invariata)" : "Password"} value={f.password} onChange={e => setF({ ...f, password: e.target.value })} />
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={f.active} onChange={e => setF({ ...f, active: e.target.checked })} /> Attivo</label>
      {err && <p className="text-sm text-red-400">{err}</p>}<button className="btn-gold w-full">Salva</button></form></div>}
  </div>);
}
