"use client";
import Translated from "@/components/public/Translated";
import { useLanguage } from "@/components/public/LanguageProvider";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatEUR } from "@/lib/pricing";
import { orderWhatsAppMessage, whatsappDraftUrl } from "@/lib/whatsapp-draft";

type Receipt = {
  number: number; status: string; channel: string; tableNumber: number | null;
  estimatedCents: number; finalCents: number | null; hasWeighted: boolean; pickupAt: string | null;
  emailStatus: string; payments: { status: string }[];
  items: { nameSnapshot: string; quantity: number; cooking: string | null; lineEstCents: number; lineFinalCents: number | null }[];
};
const statuses: Record<string, string> = { RECEIVED: "Ricevuto", CONFIRMED: "Confermato dal ristorante", PREPARING: "In preparazione", READY: "Pronto", SERVED: "Consegnato / servito", CANCELLED: "Annullato" };
export default function OrderReceipt({ id, whatsapp }: { id: string; whatsapp: string }) {
  const { locale } = useLanguage();
  const [order, setOrder] = useState<Receipt | null>(null), [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const r = await fetch(`/api/order/${id}`, { cache: "no-store" });
        if (!r.ok) throw new Error(r.status === 404 ? "Ordine non trovato." : "Aggiornamento non disponibile. Riproveremo automaticamente.");
        const j = await r.json();
        if (active) { setOrder(j); setError(""); }
      } catch (e) { if (active) setError(e instanceof Error ? e.message : "Connessione assente"); }
    }
    load(); const timer = setInterval(load, 8000);
    return () => { active = false; clearInterval(timer); };
  }, [id]);
  if (!order) return <Translated>{<div className="mx-auto max-w-xl px-4 py-16" role="status">{error || "Caricamento ordine…"}</div>}</Translated>;
  const paid = order.payments.some(p => p.status === "PAID");
  const channel = order.channel as "TABLE" | "TAKEAWAY" | "DELIVERY";
  const whatsappUrl = whatsappDraftUrl(whatsapp, orderWhatsAppMessage({
    number: order.number, channel, tableNumber: order.tableNumber, pickupAt: order.pickupAt,
    items: order.items.map(item => ({ name: item.nameSnapshot, quantity: item.quantity, cooking: item.cooking })),
    totalCents: order.finalCents ?? order.estimatedCents, weighted: order.hasWeighted && order.finalCents == null,
  }));
  return <Translated>{<article className="mx-auto max-w-xl px-4 py-14">
    <p className="text-sm uppercase tracking-widest text-gold">Vecciarì · {order.channel === "TABLE" ? `Tavolo ${order.tableNumber}` : order.channel === "TAKEAWAY" ? "Asporto" : "Consegna"}</p>
    <h1 className="mt-3 text-4xl">Ordine n° {order.number}</h1>
    <p className="mt-3 rounded-xl bg-gold/15 p-4 text-gold" role="status">{statuses[order.status]}</p>
    {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
    <p className="mt-4 text-sm text-cream/70">Conserva questa pagina: lo stato si aggiorna automaticamente.</p>
    {order.pickupAt && <p className="mt-2">Ritiro previsto: <b>{new Date(order.pickupAt).toLocaleString(locale, { timeZone: "Europe/Rome", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</b> (ora italiana)</p>}
    <ul className="mt-6 divide-y divide-cream/10">{order.items.map((item, i) => <li key={i} className="flex justify-between gap-4 py-3 text-sm"><span>{item.quantity} × <span>{item.nameSnapshot}</span>{item.cooking && <span> · {item.cooking}</span>}</span><span>{formatEUR(item.lineFinalCents ?? item.lineEstCents)}</span></li>)}</ul>
    <p className="mt-5 flex justify-between text-xl"><span>Totale {order.finalCents == null ? "indicativo" : "definitivo"}</span><b className="text-gold">{formatEUR(order.finalCents ?? order.estimatedCents)}</b></p>
    {order.hasWeighted && order.finalCents == null && <p className="mt-2 text-sm text-cream/60">Il peso effettivo e l’importo finale saranno confermati dal personale prima del pagamento.</p>}
    <p className="mt-5 rounded-xl border border-cream/15 p-4">{paid ? "Pagamento registrato dal personale." : order.status === "CANCELLED" ? "Ordine annullato. Nessun addebito online effettuato." : "Pagamento alla cassa. Nessun addebito online effettuato."}</p>
    <p className="mt-4 text-sm text-cream/60">{order.emailStatus === "sent" ? "Conferma email inviata." : order.emailStatus === "sending" ? "Conferma email in invio." : "L’invio email non è ancora disponibile. Conserva il numero d’ordine e questa pagina."}</p>
    <p className="mt-2 text-xs text-cream/50">Il riepilogo non sostituisce il documento fiscale.</p>
    {whatsappUrl && <div className="mt-5 space-y-2"><a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost block w-full text-center">Se non si è aperto, apri WhatsApp</a><p className="text-xs text-cream/50">Controlla il riepilogo precompilato e premi “Invia” per inoltrarlo al ristorante.</p></div>}
    <div className="mt-8 flex flex-wrap gap-3"><Link href="/ordina" className="btn-gold">Nuovo ordine</Link><a href="tel:+393931380073" className="btn-ghost">Chiama il ristorante</a></div>
  </article>}</Translated>;
}
