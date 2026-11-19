"use client";
import { useLiveCart } from "@/components/public/useLiveCart";
import { useMenuRefresh } from "@/components/public/useMenuRefresh";
import { useCallback, useEffect, useState } from "react";
import MenuBrowser, { type CartLine } from "@/components/public/MenuBrowser";
import CartPanel from "@/components/public/CartPanel";
import type { MenuData } from "@/lib/menu";
import { formatEUR } from "@/lib/pricing";
import OrderDetails, { emptyOrderDetails } from "@/components/public/OrderDetails";
import { customerOrderSchema } from "@/lib/checkout";
import { closeWhatsAppDraftWindow, finishWhatsAppDraftWindow, openWhatsAppDraftWindow, orderWhatsAppMessage, whatsappDraftUrl } from "@/lib/whatsapp-draft";

const LABEL: Record<string, string> = { RECEIVED: "Ricevuto", CONFIRMED: "Confermato", PREPARING: "In preparazione", READY: "Pronto", SERVED: "Servito", CANCELLED: "Annullato" };
type O = { id: string; number: number; status: string; estimatedCents: number; finalCents: number | null; hasWeighted: boolean; items: { nameSnapshot: string; quantity: number; cooking?: string | null }[] };

export default function TableOrder({ token, tableLabel, tableNumber, menu, cooking, orderingOn, logo, whatsapp }: { token: string; tableLabel: string | null; tableNumber?: number; menu: MenuData; cooking: string[]; orderingOn: boolean; logo: string; whatsapp: string }) {
  useMenuRefresh();
  const [cart, setCart] = useState<CartLine[]>([]); const [notes, setNotes] = useState(""); const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null); const [orders, setOrders] = useState<O[]>([]); const [tab, setTab] = useState<"menu" | "cart" | "status">("menu");
  // Chiave idempotenza: rigenerata solo dopo un invio riuscito → doppio tap = un solo ordine.
  const [idem, setIdem] = useState(() => crypto.randomUUID());
  const [details, setDetails] = useState(() => emptyOrderDetails(tableNumber));

  const refresh = useCallback(async () => { if (!tableLabel) return; const r = await fetch(`/api/table/${token}/order`); if (r.ok) setOrders((await r.json()).orders); }, [token, tableLabel]);
  useEffect(() => { refresh(); const t = setInterval(refresh, 8000); return () => clearInterval(t); }, [refresh]);

  async function submit() {
    if (!customerOrderSchema.safeParse(details).success) { setMsg({ ok: false, text: "Inserisci nome, email e telefono e accetta l’informativa privacy." }); return; }
    const whatsappWindow = whatsapp ? openWhatsAppDraftWindow() : null;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch(`/api/table/${token}/order`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...details, tableNumber: Number(details.tableNumber), payment: "AT_COUNTER", idempotencyKey: idem, notes: notes || undefined, items: cart.map(l => ({ productId: l.productId, quantity: l.quantity, cooking: l.cooking, optionIds: l.optionIds, notes: l.notes })) }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Errore");
      finishWhatsAppDraftWindow(whatsappWindow, whatsapp, orderWhatsAppMessage({
        number: j.number, channel: "TABLE", tableNumber: Number(details.tableNumber),
        pickupName: details.name,
        items: cart.map(line => ({ name: line.name, quantity: line.quantity, cooking: line.cooking, options: line.optionNames, notes: line.notes })),
        totalCents: cart.reduce((sum, line) => sum + line.estCents, 0),
        weighted: cart.some(line => line.weighted), notes,
      }));
      setCart([]); setNotes(""); setIdem(crypto.randomUUID()); setMsg({ ok: true, text: `Ordine n° ${j.number} inviato. ${j.emailStatus === "sent" ? "Conferma email inviata." : "Invio email non ancora disponibile: conserva il numero d’ordine."}` }); setTab("status"); refresh();
    } catch (e) { closeWhatsAppDraftWindow(whatsappWindow); setMsg({ ok: false, text: e instanceof Error ? e.message : "Connessione assente, riprova" }); }
    finally { setBusy(false); }
  }

  const menuNotice = useLiveCart(menu, cart, setCart, "TABLE");
  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 pb-28">
      <header className="flex items-center justify-between py-4"><img src={logo} alt="Vecciarì" className="h-12" />{tableLabel && <span className="rounded-full bg-gold px-4 py-1 font-display uppercase text-ink">{tableLabel}</span>}</header>
      {!orderingOn && <p className="rounded-xl border border-gold/30 p-3 text-sm">Al momento gli ordini dal tavolo non sono attivi: puoi consultare il menu e ordinare con il personale.</p>}
      {menuNotice && <p role="status" className="my-3 rounded-lg border border-gold/30 p-3 text-sm">{menuNotice}</p>}
      {msg && <p role="status" className={`my-3 rounded-xl p-3 ${msg.ok ? "bg-gold text-ink" : "bg-red-900/60"}`}>{msg.text}</p>}
      {tab === "menu" && <MenuBrowser menu={menu} cooking={cooking} cartEnabled={orderingOn} cart={cart} liveRefresh={false} onCartChange={c => { setCart(c); setMsg(null); }} />}
     {tab === "cart" && <div className="mt-4"><CartPanel cart={cart} setCart={setCart} notes={notes} setNotes={setNotes} onSubmit={submit} busy={busy} cta="Conferma ordine · paga alla cassa"><OrderDetails value={details} onChange={setDetails} channel="TABLE" fixedTable />
       {whatsapp && <p className="mt-3 text-xs text-cream/60">Dopo la registrazione proveremo ad aprire WhatsApp con numero, nome e riepilogo. Email e telefono non sono inseriti. Il messaggio parte solo se premi “Invia”.</p>}
     </CartPanel></div>}
      {tab === "status" && <div className="mt-4 space-y-3">{!orders.length && <p className="text-cream/60">Nessun ordine ancora inviato da questo tavolo.</p>}
        {orders.map(o => <div key={o.id} className="card"><div className="flex justify-between"><b className="font-display uppercase">Ordine n° {o.number}</b><span className="text-gold">{LABEL[o.status]}</span></div>
          <p className="mt-1 text-sm text-cream/60">{o.items.map(i => `${i.quantity}× ${i.nameSnapshot}`).join(", ")}</p>
           <p className="mt-1 text-sm">{o.finalCents != null ? `Totale: ${formatEUR(o.finalCents)}` : `Totale indicativo: ${formatEUR(o.estimatedCents)}`}</p>
           {whatsapp && <a className="mt-3 inline-block text-sm text-gold underline" href={whatsappDraftUrl(whatsapp, orderWhatsAppMessage({
             number: o.number, channel: "TABLE", tableNumber,
             items: o.items.map(item => ({ name: item.nameSnapshot, quantity: item.quantity, cooking: item.cooking })),
             totalCents: o.finalCents ?? o.estimatedCents, weighted: o.hasWeighted && o.finalCents == null,
           })) ?? undefined} target="_blank" rel="noopener noreferrer">Se WhatsApp non si è aperto, apri il riepilogo</a>}</div>)}</div>}
      {orderingOn && <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-cream/10 bg-ink/95 backdrop-blur" aria-label="Tavolo">
        {(["menu", "cart", "status"] as const).map(t => <button key={t} onClick={() => setTab(t)} aria-current={tab === t} className={`py-4 font-display text-sm uppercase ${tab === t ? "text-gold" : "text-cream/70"}`}>
          {t === "menu" ? "Menu" : t === "cart" ? `Carrello${cart.length ? ` (${cart.reduce((s, l) => s + l.quantity, 0)})` : ""}` : "I miei ordini"}</button>)}
      </nav>}
    </div>);
}
