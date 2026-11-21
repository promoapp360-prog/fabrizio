"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./ResourceManager";
import { formatEUR } from "@/lib/pricing";

/* eslint-disable @typescript-eslint/no-explicit-any */
const L: Record<string, string> = { RECEIVED: "Ricevuto", CONFIRMED: "Confermato", PREPARING: "In preparazione", READY: "Pronto", SERVED: "Servito", CANCELLED: "Annullato" };
const NEXT: Record<string, string[]> = { RECEIVED: ["CONFIRMED", "CANCELLED"], CONFIRMED: ["PREPARING", "CANCELLED"], PREPARING: ["READY", "CANCELLED"], READY: ["SERVED"] };
const CH: Record<string, string> = { TABLE: "Tavolo", TAKEAWAY: "Asporto", DELIVERY: "Consegna" };

/** Schermata operativa: aggiornamento automatico ogni 4s, segnale acustico sui nuovi ordini. mode="kitchen" = vista cucina semplificata. */
export default function OrdersBoard({ mode, canPay, orderingOn }: { mode: "floor" | "kitchen"; canPay: boolean; orderingOn?: boolean }) {
  const [orders, setOrders] = useState<any[]>([]); const [err, setErr] = useState(""); const [history, setHistory] = useState(false); const [on, setOn] = useState(orderingOn);
  const seen = useRef<Set<string> | null>(null);
  const load = useCallback(async () => {
    try {
      const os = await api(`/api/admin/orders${history ? "?all=1" : ""}`); setErr("");
      if (seen.current && os.some((o: any) => !seen.current!.has(o.id))) try { new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=").play(); navigator.vibrate?.(200); } catch {}
      seen.current = new Set(os.map((o: any) => o.id)); setOrders(os);
    } catch (e: any) { setErr(`Connessione: ${e.message}`); }
  }, [history]);
  useEffect(() => { load(); const t = setInterval(load, 4000); return () => clearInterval(t); }, [load]);

  const act = async (id: string, body: any) => { try { await api(`/api/admin/orders/${id}`, "PATCH", body); load(); } catch (e: any) { alert(e.message); } };
  const toggleOrdering = async () => { await api("/api/admin/settings", "PUT", { key: "ordering", value: { tableEnabled: !on } }); setOn(!on); };
  const list = mode === "kitchen" ? orders.filter(o => ["CONFIRMED", "PREPARING", "READY", "RECEIVED"].includes(o.status)) : orders;

  return (<div>
    <div className="no-print flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl">{mode === "kitchen" ? "Cucina" : "Ordini"}</h1>
      <div className="flex flex-wrap gap-2">
        {mode === "floor" && <><button className="btn-ghost !py-2 text-sm" onClick={() => setHistory(!history)}>{history ? "Solo attivi" : "Storico"}</button>
          <button className={`btn !py-2 text-sm ${on ? "border border-cream/20" : "bg-red-700"}`} onClick={toggleOrdering}>{on ? "Sospendi ordini QR" : "Ordini QR sospesi — riattiva"}</button></>}
      </div></div>
    {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
    <div className={`mt-6 grid gap-4 ${mode === "kitchen" ? "md:grid-cols-2 xl:grid-cols-3" : "lg:grid-cols-2"}`}>
      {list.map(o => (
        <article key={o.id} className={`ticket card break-inside-avoid ${o.status === "RECEIVED" ? "border-gold" : ""}`}>
          <header className="flex items-start justify-between border-b border-dashed border-cream/20 pb-2">
            <div><p className={`font-display uppercase ${mode === "kitchen" ? "text-3xl" : "text-xl"}`}>{o.tableNumber ? `Tavolo ${o.tableNumber}` : CH[o.channel]}</p>
              <p className="text-xs text-cream/60">#{o.number} · {new Date(o.createdAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}{o.pickupAt && ` · per le ${new Date(o.pickupAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`}{o.customer && ` · ${o.channel === "TAKEAWAY" ? "Ritiro: " : ""}${o.customerName || o.customer.name} ${o.customer.phone ?? ""}`}</p></div>
            <span className="rounded bg-gold/20 px-2 py-1 text-xs text-gold">{L[o.status]}</span></header>
          <ul className={`my-3 space-y-2 ${mode === "kitchen" ? "text-lg" : "text-sm"}`}>{o.items.map((i: any) => (
            <li key={i.id}><b>{i.quantity}× {i.nameSnapshot}</b>{i.cooking && <span className="ml-2 rounded bg-gold px-1.5 text-ink">{i.cooking}</span>}
              {i.options.length > 0 && <p className="text-cream/70">{i.options.map((x: any) => x.name).join(", ")}</p>}
              {i.notes && <p className="italic text-gold">» {i.notes}</p>}
              {i.estWeightGrams != null && (o.pricingPolicy === "FIXED_PORTIONS"
                ? <p className="text-sm text-gold">Pezzatura scelta: {i.estWeightGrams} g · prezzo definitivo</p>
                : <WeightInput item={i} disabled={o.payments?.some((p: any) => ["PAID", "REFUNDED"].includes(p.status) || p.method === "STRIPE" && p.status === "PENDING")} onSave={g => act(o.id, { action: "weight", itemId: i.id, grams: g })} />)}
            </li>))}</ul>
          {o.notes && <p className="rounded bg-gold/10 p-2 text-sm"><b>Note:</b> {o.notes}</p>}
          {o.partySize > 0 && <p className="text-sm">Ordine per {o.partySize} persone · Coperti su questo ordine: {o.coverCount} × {formatEUR(o.coverUnitCents)}</p>}
          {o.deliveryAddress && <p className="text-sm">📍 {o.deliveryAddress}</p>}
          {mode === "floor" && <p className="mt-2 text-sm">{o.finalCents != null ? <>Totale definitivo <b>{formatEUR(o.finalCents)}</b></> : <>Totale indicativo {formatEUR(o.estimatedCents)}</>}
            {o.payments?.some((p: any) => p.status === "PAID") && <span className="ml-2 text-green-400">{o.payments.some((p: any) => p.method === "STRIPE" && p.status === "PAID") ? "Pagato online · Stripe" : "Pagato"}</span>}
            {o.payments?.some((p: any) => p.status === "REFUNDED") && <span className="ml-2 text-gold">Rimborsato su Stripe</span>}
            {o.payments?.some((p: any) => p.method === "STRIPE" && p.status === "PENDING") && <span className="ml-2 text-gold">Pagamento online aperto / in verifica</span>}</p>}
          <div className="no-print mt-3 flex flex-wrap gap-2">
            {(NEXT[o.status] ?? []).filter(s => mode === "floor" || ["PREPARING", "READY"].includes(s)).map(s => (
              <button key={s} onClick={() => (s !== "CANCELLED" || confirm("Annullare l'ordine?")) && act(o.id, { action: "status", status: s })} className={s === "CANCELLED" ? "btn !px-3 !py-1.5 text-xs text-red-400" : "btn-gold !px-4 !py-1.5 text-sm"}>{L[s]}</button>))}
            <button className="btn !px-3 !py-1.5 text-xs border border-cream/20" onClick={() => printTicket(o)}>Stampa</button>
            {mode === "floor" && <button className="btn !px-3 !py-1.5 text-xs border border-cream/20" onClick={async () => { try { const r = await api(`/api/admin/orders/${o.id}`, "PATCH", { action: "retryEmail" }); alert(r.status === "sent" ? "Conferma email inviata (nessun duplicato se già inviata)." : r.status === "skipped_not_configured" ? "Servizio email non ancora configurato." : "Invio non riuscito o in corso. Controlla le comunicazioni del cliente."); } catch { alert("Impossibile inviare l’email."); } }}>Invia conferma email</button>}
            {mode === "floor" && canPay && o.hasWeighted && o.finalCents == null && <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => confirm("Il cliente ha confermato l'importo definitivo?") && act(o.id, { action: "confirmFinal" })}>Conferma importo</button>}
            {mode === "floor" && canPay && o.payments?.some((p: any) => p.method === "STRIPE" && p.status === "PENDING") &&
              <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => confirm("Annullare il tentativo online? Se Stripe ha già incassato, la cassa rimarrà bloccata fino alla conferma.") && act(o.id, { action: "cancelOnline" })}>Annulla tentativo online</button>}
            {mode === "floor" && canPay && o.finalCents != null && !o.payments?.some((p: any) => ["PAID", "REFUNDED"].includes(p.status) || p.method === "STRIPE" && p.status === "PENDING") && (
              <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => { if (confirm(`Confermi di avere incassato ${formatEUR(o.finalCents)} alla cassa?`)) act(o.id, { action: "payment", method: o.channel === "TABLE" ? "AT_COUNTER" : "ON_PICKUP", amountCents: o.finalCents }); }}>Registra pagamento in cassa</button>)}
          </div>
        </article>))}
      {!list.length && <p className="text-cream/50">Nessun ordine.</p>}
    </div>
  </div>);
}

function WeightInput({ item, onSave, disabled }: { item: any; onSave: (g: number) => void; disabled?: boolean }) {
  const [g, setG] = useState(item.actualWeightGrams ?? "");
  return <div className="no-print mt-1 flex items-center gap-2 text-sm"><span className="text-cream/60">Peso stimato {item.estWeightGrams} g · effettivo</span>
    <input disabled={disabled} className="input !w-24 !py-1" type="number" inputMode="numeric" value={g} onChange={e => setG(e.target.value)} /> g
    <button disabled={disabled} className="text-gold underline disabled:opacity-40" onClick={() => g && onSave(Number(g))}>Salva</button>
    {item.lineFinalCents != null && <span>= {formatEUR(item.lineFinalCents)}</span>}</div>;
}

function printTicket(o: any) {
  const w = window.open("", "_blank", "width=380,height=600"); if (!w) return;
  const esc = (s: string) => String(s ?? "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
  w.document.write(`<html><head><title>Comanda #${o.number}</title><style>body{font-family:monospace;width:72mm;margin:0;padding:4mm;font-size:13px}h1{font-size:22px;margin:0}hr{border:0;border-top:1px dashed #000}.n{font-style:italic}</style></head><body>
<h1>${o.tableNumber ? "TAVOLO " + o.tableNumber : esc(CH[o.channel]).toUpperCase()}</h1><div>Comanda #${o.number} – ${new Date(o.createdAt).toLocaleString("it-IT")}</div><hr/>
${o.partySize ? `<div>Persone: ${Number(o.partySize)} · Coperti: ${Number(o.coverCount)}</div>` : ""}
${o.items.map((i: any) => `<div><b>${i.quantity} x ${esc(i.nameSnapshot)}</b>${i.cooking ? ` [${esc(i.cooking)}]` : ""}${i.options.length ? `<br/>&nbsp;&nbsp;${esc(i.options.map((x: any) => x.name).join(", "))}` : ""}${i.notes ? `<br/><span class="n">&nbsp;&nbsp;» ${esc(i.notes)}</span>` : ""}${i.estWeightGrams ? `<br/>&nbsp;&nbsp;${o.pricingPolicy === "FIXED_PORTIONS" ? "pezzatura " : "peso ≈"}${Number(i.estWeightGrams)}g` : ""}</div>`).join("")}
<hr/>${o.notes ? `<div class="n">NOTE: ${esc(o.notes)}</div>` : ""}<script>window.print();setTimeout(()=>window.close(),500)</script></body></html>`);
  w.document.close();
}
