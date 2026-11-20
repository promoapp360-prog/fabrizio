"use client";
import Translated from "@/components/public/Translated";
import { useLanguage } from "@/components/public/LanguageProvider";
import { useEffect, useState } from "react";
import { reservationWhatsAppMessage } from "@/lib/whatsapp-draft";

type Receipt = { code: string; status: string; startsAt: string; people: number; emailStatus: string };
const labels: Record<string, string> = {
  PENDING: "Richiesta ricevuta", CONFIRMED: "Prenotazione confermata", CANCELLED: "Prenotazione annullata",
  SEATED: "Benvenuto da Vecciarì", COMPLETED: "Visita completata", NO_SHOW: "Prenotazione non utilizzata", WAITLIST: "In lista d’attesa",
};
export default function ReservationReceipt({ id, phone, whatsapp, onNew }: { id: string; phone: string; whatsapp: string; onNew: () => void }) {
  const { locale } = useLanguage();
  const [receipt, setReceipt] = useState<Receipt | null>(null), [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function load() {
      try {
        const r = await fetch(`/api/reservations/${encodeURIComponent(id)}`, { cache: "no-store", signal: controller.signal });
        if (!r.ok) throw new Error(r.status === 404 ? "Richiesta non trovata. Contatta il ristorante se hai già ricevuto un codice." : "Impossibile aggiornare lo stato. Riproveremo automaticamente.");
        const j = await r.json();
        if (active) { setReceipt(j); setError(""); }
      } catch (e) { if (active && !controller.signal.aborted) setError(e instanceof Error ? e.message : "Connessione non disponibile"); }
    }
    load(); const timer = setInterval(load, 15000);
    return () => { active = false; controller.abort(); clearInterval(timer); };
  }, [id]);
  if (!receipt) return <Translated>{<div role="status" className="card mt-8 space-y-4"><p>{error || "Caricamento del riepilogo…"}</p>{error && <button className="btn-ghost" onClick={onNew}>Torna alle prenotazioni</button>}</div>}</Translated>;
  const date = new Date(receipt.startsAt).toLocaleString(locale, { timeZone: "Europe/Rome", dateStyle: "full", timeStyle: "short" });
  const startsAt = new Date(receipt.startsAt);
  const localDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(startsAt);
  const localTime = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" }).format(startsAt);
  const message = reservationWhatsAppMessage({ code: receipt.code, date: localDate, time: localTime, people: receipt.people });
  return <Translated>{<section className="card mt-8 space-y-5 text-center" aria-label="Riepilogo prenotazione">
    <img src="/brand/fiamma-oro.webp" alt="" className="mx-auto h-16" />
    <h2 className="text-3xl text-gold" role="status">{labels[receipt.status] || "Stato prenotazione"}</h2>
    <p className="text-sm text-cream/75">{receipt.status === "PENDING" ? "La richiesta è stata registrata. Attendi la conferma del ristorante prima di considerare riservato il tavolo." : receipt.status === "CONFIRMED" ? "Il ristorante ha confermato il tuo tavolo. Ti aspettiamo!" : "Per informazioni o modifiche contatta il ristorante."}</p>
    <div className="rounded-xl border border-gold/25 p-4 text-sm"><p>Codice <b className="text-lg text-gold">{receipt.code}</b></p><p className="mt-3">{date}</p><p className="mt-1">{receipt.people} persone</p></div>
    <p className="text-xs text-cream/60">Conserva il codice o il link di questa pagina: il riepilogo rimane disponibile dopo la ricarica e lo stato si aggiorna automaticamente.</p>
    <p className="text-sm text-cream/65">{receipt.emailStatus === "sent" ? "Email di ricezione della richiesta inviata." : receipt.emailStatus === "sending" ? "Email di ricezione in invio." : "L’email di ricezione non è disponibile in questo momento. La richiesta è registrata: conserva questo riepilogo."}</p>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    {!["CANCELLED", "COMPLETED", "NO_SHOW"].includes(receipt.status) && whatsapp && <a className="btn-gold min-h-12 w-full" href={`https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">Se non si è aperto, apri WhatsApp</a>}
    {whatsapp && <p className="text-xs text-cream/50">WhatsApp mostra il riepilogo già compilato. Controllalo e premi “Invia” se vuoi inoltrarlo al ristorante.</p>}
    {phone && <a className="btn-ghost min-h-12 w-full" href={`tel:${phone.replace(/[^\d+]/g, "")}`}>Chiama il ristorante</a>}
    <button type="button" className="w-full py-3 text-sm underline" onClick={onNew}>Nuova richiesta</button>
  </section>}</Translated>;
}
