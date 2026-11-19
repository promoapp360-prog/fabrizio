"use client";
import { useState } from "react";
import MenuBrowser, { type CartLine } from "@/components/public/MenuBrowser";
import CartPanel from "@/components/public/CartPanel";
import type { MenuData } from "@/lib/menu";
import { formatEUR } from "@/lib/pricing";
import { useLiveCart } from "@/components/public/useLiveCart";
import { useMenuRefresh } from "@/components/public/useMenuRefresh";

export default function OnlineOrder(p: { menu: MenuData; cooking: string[]; takeaway: boolean; delivery: boolean; stripe: boolean; prepMinutes: number; minDelivery: number; feeDelivery: number; zones: string }) {
  useMenuRefresh();
  const [cart, setCart] = useState<CartLine[]>([]); const [notes, setNotes] = useState(""); const [busy, setBusy] = useState(false);
  const [channel, setChannel] = useState<"TAKEAWAY" | "DELIVERY">(p.takeaway ? "TAKEAWAY" : "DELIVERY");
  const [c, setC] = useState({ name: "", phone: "", email: "", address: "", pickupAt: "", privacy: false, payment: "ON_PICKUP" as "ON_PICKUP" | "STRIPE" });
  const [err, setErr] = useState(""); const [done, setDone] = useState<number | null>(null); const [idem, setIdem] = useState(() => crypto.randomUUID());
  const minTime = new Date(Date.now() + p.prepMinutes * 60000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const channelMenu = { ...p.menu, products: p.menu.products.filter(product => product.channels.includes(channel)) };
  const menuNotice = useLiveCart(channelMenu, cart, setCart, channel);

  async function submit() {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/online-order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        idempotencyKey: idem, notes: notes || undefined, channel, ...c, address: c.address || undefined,
        items: cart.map(l => ({ productId: l.productId, quantity: l.quantity, cooking: l.cooking, optionIds: l.optionIds, notes: l.notes })) }) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error ?? "Errore");
      setDone(j.number); setCart([]); setIdem(crypto.randomUUID());
    } catch (e) { setErr(e instanceof Error ? e.message : "Errore"); } finally { setBusy(false); }
  }
  if (done) return <div className="mx-auto max-w-xl px-4 py-24 text-center"><h1 className="text-4xl">Ordine n° {done} ricevuto</h1><p className="mt-4 text-cream/70">Riceverai conferma dal ristorante.</p></div>;

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1fr_380px]">
      <div><h1 className="text-5xl">Ordina online</h1>{menuNotice && <p role="status" className="my-3 rounded-lg border border-gold/30 p-3 text-sm">{menuNotice}</p>}<MenuBrowser menu={channelMenu} cooking={p.cooking} cartEnabled cart={cart} liveRefresh={false} onCartChange={setCart} /></div>
      <aside className="lg:sticky lg:top-24 lg:self-start"><CartPanel cart={cart} setCart={setCart} notes={notes} setNotes={setNotes} busy={busy} onSubmit={submit} cta="Conferma ordine">
        <div className="mt-4 space-y-3">
          {p.takeaway && p.delivery && <div className="grid grid-cols-2 gap-2">{(["TAKEAWAY", "DELIVERY"] as const).map(x => <button key={x} type="button" aria-pressed={channel === x} onClick={() => setChannel(x)} className={`rounded-lg py-2 text-sm ${channel === x ? "bg-gold text-ink" : "border border-cream/20"}`}>{x === "TAKEAWAY" ? "Ritiro" : "Consegna"}</button>)}</div>}
          <input className="input" placeholder="Nome *" value={c.name} onChange={e => setC({ ...c, name: e.target.value })} />
          <input className="input" type="tel" placeholder="Telefono *" value={c.phone} onChange={e => setC({ ...c, phone: e.target.value })} />
          <input className="input" type="email" placeholder="Email" value={c.email} onChange={e => setC({ ...c, email: e.target.value })} />
          {channel === "DELIVERY" && <><input className="input" placeholder="Indirizzo di consegna *" value={c.address} onChange={e => setC({ ...c, address: e.target.value })} />
            <p className="text-xs text-cream/60">Minimo {formatEUR(p.minDelivery)} · consegna {formatEUR(p.feeDelivery)}{p.zones && ` · zone: ${p.zones}`}</p></>}
          <label className="block"><span className="label">{channel === "DELIVERY" ? "Orario consegna" : "Orario ritiro"} *</span><input className="input" type="datetime-local" min={minTime} value={c.pickupAt} onChange={e => setC({ ...c, pickupAt: e.target.value })} /></label>
          <select className="input" value={c.payment} onChange={e => setC({ ...c, payment: e.target.value as "ON_PICKUP" })} aria-label="Pagamento"><option value="ON_PICKUP">{channel === "DELIVERY" ? "Paga alla consegna" : "Paga al ritiro"}</option>{p.stripe && <option value="STRIPE">Paga online (carta)</option>}</select>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={c.privacy} onChange={e => setC({ ...c, privacy: e.target.checked })} /> Accetto l&apos;<a href="/privacy" className="underline">informativa privacy</a> *</label>
          {err && <p role="alert" className="rounded bg-red-900/50 p-2 text-sm">{err}</p>}
        </div>
      </CartPanel></aside>
    </div>);
}
