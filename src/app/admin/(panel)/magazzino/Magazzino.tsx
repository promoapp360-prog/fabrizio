"use client";
import { useEffect, useState } from "react";
import { api } from "@/components/admin/ResourceManager";
/* eslint-disable @typescript-eslint/no-explicit-any */
export default function Magazzino({ products }: { products: { id: string; name: string }[] }) {
  const [items, setItems] = useState<any[]>([]); const [n, setN] = useState({ name: "", unit: "kg", productId: "", minLevel: 0 }); const [err, setErr] = useState("");
  const load = () => api("/api/admin/stock").then(setItems).catch(e => setErr(e.message));
  useEffect(() => { load(); }, []);
  const move = async (it: any, type: string) => {
    const v = prompt(`${type === "LOAD" ? "Carico" : type === "WASTE" ? "Scarto" : "Rettifica (+/-)"} in ${it.unit}`); if (!v) return;
    const reason = type === "ADJUSTMENT" ? prompt("Motivo della rettifica") ?? undefined : undefined;
    try { await api("/api/admin/stock", "POST", { itemId: it.id, type, delta: parseFloat(v.replace(",", ".")), reason }); load(); } catch (e: any) { alert(e.message); }
  };
  return (<div>
    <h1 className="text-3xl">Magazzino</h1>
    {err && <p className="text-red-400">{err}</p>}
    <form className="card mt-6 grid gap-2 md:grid-cols-5" onSubmit={async e => { e.preventDefault(); await api("/api/admin/stock", "POST", { ...n, productId: n.productId || undefined, minLevel: Number(n.minLevel) }); setN({ name: "", unit: "kg", productId: "", minLevel: 0 }); load(); }}>
      <input className="input md:col-span-2" required placeholder="Articolo (es. Costata Fassona)" value={n.name} onChange={e => setN({ ...n, name: e.target.value })} />
      <select className="input" value={n.unit} onChange={e => setN({ ...n, unit: e.target.value })}><option value="kg">kg</option><option value="g">g</option><option value="pz">pezzi</option></select>
      <select className="input" value={n.productId} onChange={e => setN({ ...n, productId: e.target.value })}><option value="">Prodotto menu collegato</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      <div className="flex gap-2"><input className="input" type="number" step="0.001" placeholder="Soglia" value={n.minLevel} onChange={e => setN({ ...n, minLevel: Number(e.target.value) })} /><button className="btn-gold !px-4">+</button></div>
    </form>
    <div className="mt-6 overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs uppercase text-cream/60"><tr><th className="p-2">Articolo</th><th>Giacenza</th><th>Soglia</th><th>Ultimi movimenti</th><th /></tr></thead>
      <tbody>{items.map(it => { const low = Number(it.quantity) <= Number(it.minLevel); return (
        <tr key={it.id} className="border-t border-cream/10 align-top"><td className="p-2">{it.name}{it.product && <p className="text-xs text-cream/50">→ {it.product.name} {it.product.available ? "" : "(esaurito nel menu)"}</p>}</td>
          <td className={low ? "font-bold text-gold" : ""}>{Number(it.quantity)} {it.unit}{low && " ⚠"}</td><td>{Number(it.minLevel)}</td>
          <td className="text-xs text-cream/60">{it.moves.slice(0, 3).map((m: any) => <p key={m.id}>{new Date(m.createdAt).toLocaleDateString("it-IT")} {m.type} {Number(m.delta)} {m.reason ?? ""}</p>)}</td>
          <td className="space-x-2 whitespace-nowrap text-xs"><button className="text-gold underline" onClick={() => move(it, "LOAD")}>Carico</button><button className="underline" onClick={() => move(it, "WASTE")}>Scarto</button><button className="underline" onClick={() => move(it, "ADJUSTMENT")}>Rettifica</button></td></tr>); })}</tbody></table></div>
    <p className="mt-4 text-xs text-cream/50">Quando la giacenza di un articolo collegato arriva a zero, il piatto viene segnato automaticamente come esaurito.</p>
  </div>);
}
