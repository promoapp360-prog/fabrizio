"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { reservationInputSchema, todayInRome, type ReservationAvailability } from "@/lib/reservation-input";
import ReservationReceipt from "./ReservationReceipt";

type Step = 0 | 1 | 2 | 3;
const steps = ["Data", "Persone", "Orario", "Dati cliente"];
const blank = () => ({ date: todayInRome(), people: 0, time: "", name: "", phone: "", email: "", notes: "", privacy: false, marketing: false });

export default function ReservationForm({ maxParty, phone, whatsapp, initialReceiptId }: {
  maxParty: number; phone: string; whatsapp: string; initialReceiptId?: string;
}) {
  const router = useRouter();
  const [f, setF] = useState(blank), [step, setStep] = useState<Step>(0);
  const [availability, setAvailability] = useState<ReservationAvailability | null>(null);
  const [loading, setLoading] = useState(false), [availabilityError, setAvailabilityError] = useState("");
  const [error, setError] = useState(""), [busy, setBusy] = useState(false), [group, setGroup] = useState(false);
  const [refresh, setRefresh] = useState(0), [idem, setIdem] = useState(() => crypto.randomUUID());
  const [receiptId, setReceiptId] = useState(initialReceiptId);
  const heading = useRef<HTMLHeadingElement>(null), previousStep = useRef(step);
  useEffect(() => setReceiptId(initialReceiptId), [initialReceiptId]);
  useEffect(() => {
    if (previousStep.current !== step) heading.current?.focus();
    previousStep.current = step;
  }, [step]);

  useEffect(() => {
    if (receiptId || !f.date) return;
    const controller = new AbortController();
    let active = true;
    async function load(background = false) {
      if (!background) setLoading(true);
      try {
        const r = await fetch(`/api/reservations?date=${encodeURIComponent(f.date)}&people=${f.people || 2}`, { cache: "no-store", signal: controller.signal });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Impossibile leggere le disponibilità.");
        if (!active) return;
        setAvailability(j); setAvailabilityError("");
        setF(current => {
          if (!current.time || j.slots.includes(current.time)) return current;
          return { ...current, time: "" };
        });
        if (f.time && !j.slots.includes(f.time)) {
          setError("La disponibilità è cambiata: scegli un nuovo orario.");
          setStep(current => current === 3 ? 2 : current);
        }
      } catch (e) {
        if (active && !controller.signal.aborted) setAvailabilityError(e instanceof Error ? e.message : "Connessione non disponibile.");
      } finally { if (active) setLoading(false); }
    }
    load();
    const timer = step >= 2 ? setInterval(() => load(true), 20000) : undefined;
    return () => { active = false; controller.abort(); clearInterval(timer); };
    // A fresh request is made on each step, date or party change; polling uses
    // the selected time to return to the picker if that choice becomes full.
  }, [f.date, f.people, f.time, step, refresh, receiptId]);

  const set = (key: keyof typeof f, value: string | boolean) => { setF(current => ({ ...current, [key]: value })); setError(""); };
  const readableDate = f.date ? new Date(`${f.date}T12:00:00`).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";
  const wa = whatsapp.replace(/\D/g, "");
  const contactLink = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(`Buongiorno, vorrei prenotare da Vecciarì per oltre ${maxParty} persone${f.date ? ` il ${readableDate}` : ""}. Possiamo organizzare il tavolo?`)}` : "";
  function advance() {
    setError("");
    if (step === 0 && f.date >= todayInRome() && availability?.open && !loading && !availabilityError) setStep(1);
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (step !== 3) { advance(); return; }
    const parsed = reservationInputSchema.safeParse({ ...f, idempotencyKey: idem });
    if (!parsed.success) { setError("Completa nome, telefono, email valida e consenso privacy."); return; }
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/reservations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const j = await r.json();
      if (!r.ok) {
        if (r.status === 409) { setF(current => ({ ...current, time: "" })); setStep(2); setRefresh(n => n + 1); }
        throw new Error(j.error || "Richiesta non inviata. Riprova.");
      }
      setReceiptId(j.id);
      router.replace(`/prenota?richiesta=${encodeURIComponent(j.id)}`, { scroll: false });
    } catch (e) { setError(e instanceof Error ? e.message : "Connessione assente: riprova senza duplicare la richiesta."); }
    finally { setBusy(false); }
  }
  function startAgain() {
    setReceiptId(undefined); setStep(0); setF(blank()); setGroup(false); setError("");
    setAvailability(null); setIdem(crypto.randomUUID()); router.replace("/prenota", { scroll: false });
  }
  if (receiptId) return <ReservationReceipt id={receiptId} phone={phone} whatsapp={whatsapp} onNew={startAgain} />;

  return <form onSubmit={submit} className="card mt-8 min-w-0 space-y-6">
    <ol className="grid grid-cols-4 gap-1" aria-label="Avanzamento prenotazione">
      {steps.map((label, index) => <li key={label}><button type="button" disabled={index > step || busy} aria-current={index === step ? "step" : undefined}
        onClick={() => { setStep(index as Step); setError(""); }} className="flex min-h-16 w-full flex-col items-center gap-1.5 rounded-lg py-1 disabled:cursor-default">
        <span className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm ${index <= step ? "border-gold bg-gold text-ink" : "border-cream/20 text-cream/40"}`}>{index < step ? "✓" : index + 1}</span>
        <span className={`text-[11px] sm:text-xs ${index === step ? "text-gold" : "text-cream/60"}`}>{label}</span>
      </button></li>)}
    </ol>
    <h2 ref={heading} tabIndex={-1} className="text-2xl outline-none">{["Quando vuoi venire?", "Quante persone?", "Scegli l’orario", "I tuoi dati"][step]}</h2>

    {step === 0 && <div className="space-y-4">
      <label className="block"><span className="label">Data della visita</span><input required type="date" min={todayInRome()} className="input min-h-12 min-w-0"
        value={f.date} onChange={e => { setF(current => ({ ...current, date: e.target.value, time: "" })); setAvailability(null); setError(""); }} /></label>
      {loading && <p role="status" className="text-sm text-cream/60">Controllo giorni di apertura…</p>}
      {availability?.closed && <p role="status" className="rounded-xl border border-gold/30 p-3 text-sm text-gold">{availability.closed}. Scegli un altro giorno.</p>}
      <button type="button" onClick={advance} className="btn-gold min-h-12 w-full" disabled={!f.date || f.date < todayInRome() || loading || !availability?.open || !!availabilityError}>Continua</button>
    </div>}

    {step === 1 && <div className="space-y-4">
      <p className="text-sm text-cream/70">{readableDate}</p>
      {!group ? <>
        <div className="grid grid-cols-5 gap-2">{Array.from({ length: Math.min(maxParty, 40) }, (_, index) => index + 1).map(n =>
          <button type="button" key={n} aria-pressed={f.people === n} className={`min-h-12 rounded-xl border text-lg ${f.people === n ? "border-gold bg-gold text-ink" : "border-cream/20 text-cream hover:border-gold"}`}
            onClick={() => { setF(current => ({ ...current, people: n, time: "" })); setAvailability(null); setError(""); setStep(2); }}>{n}</button>)}</div>
        <button type="button" onClick={() => setGroup(true)} className="btn-ghost min-h-12 w-full text-sm">Più di {maxParty} persone?</button>
      </> : <div className="space-y-3 rounded-xl border border-gold/30 p-4">
        <h3 className="text-xl text-gold">Organizziamo insieme il tuo gruppo</h3>
        <p className="text-sm text-cream/75">Per oltre {maxParty} persone contattaci direttamente. Da qui non viene inviata alcuna prenotazione.</p>
        {phone && <a className="btn-gold min-h-12 w-full" href={`tel:${phone.replace(/[^\d+]/g, "")}`}>Chiama {phone}</a>}
        {contactLink && <a className="btn-ghost min-h-12 w-full" href={contactLink} target="_blank" rel="noopener noreferrer">Scrivi su WhatsApp</a>}
        <button className="w-full py-3 text-sm underline" type="button" onClick={() => setGroup(false)}>Torna alla scelta delle persone</button>
      </div>}
    </div>}

    {step === 2 && <div className="space-y-5">
      <p className="text-sm text-cream/70">{readableDate} · {f.people} persone</p>
      {loading ? <p role="status" className="py-6 text-cream/60">Cerco gli orari disponibili…</p>
        : availability?.closed ? <p role="status" className="text-gold">{availability.closed}</p>
        : !availabilityError && !availability?.slots.length ? <p role="status" className="rounded-xl border border-cream/15 p-4 text-sm">Nessun orario disponibile per {f.people} persone. Prova un altro giorno o contattaci.</p>
        : availability?.services.filter(service => service.slots.length > 0).map(service => <fieldset key={service.id} className="space-y-3">
          <legend className="label !text-gold">{service.name}</legend>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{service.slots.map(time => <button key={time} type="button" className="min-h-12 rounded-xl border border-cream/20 px-2 py-2 text-sm hover:border-gold hover:text-gold"
            onClick={() => { setF(current => ({ ...current, time })); setError(""); setStep(3); }}>{time}</button>)}</div>
        </fieldset>)}
      <p className="text-xs text-cream/50">Orari italiani. La disponibilità viene aggiornata automaticamente e ricontrollata all’invio.</p>
      <button type="button" onClick={() => setStep(0)} className="w-full py-2 text-sm text-gold underline">Cambia data</button>
    </div>}

    {step === 3 && <div className="space-y-4">
      <div className="rounded-xl border border-gold/25 bg-gold/5 p-4 text-sm"><p className="font-semibold text-gold">{readableDate}</p><p className="mt-1">Ore {f.time} · {f.people} persone</p></div>
      <label className="block"><span className="label">Nome e cognome *</span><input className="input min-h-12" required minLength={2} maxLength={80} autoComplete="name" value={f.name} onChange={e => set("name", e.target.value)} /></label>
      <label className="block"><span className="label">Telefono *</span><input className="input min-h-12" type="tel" required minLength={6} maxLength={25} autoComplete="tel" value={f.phone} onChange={e => set("phone", e.target.value)} /></label>
      <label className="block"><span className="label">Email per la conferma *</span><input className="input min-h-12" type="email" required maxLength={160} autoComplete="email" value={f.email} onChange={e => set("email", e.target.value)} /></label>
      <label className="block"><span className="label">Note e richieste speciali</span><textarea className="input" rows={3} maxLength={500} placeholder="Allergie, compleanni, occasioni speciali…" value={f.notes} onChange={e => set("notes", e.target.value)} /></label>
      <label className="flex items-start gap-3 text-sm"><input className="mt-1 h-4 w-4 shrink-0" type="checkbox" required checked={f.privacy} onChange={e => set("privacy", e.target.checked)} /><span>Ho letto l’<a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline">informativa privacy</a> e acconsento al trattamento dei dati per gestire la prenotazione. *</span></label>
      <label className="flex items-start gap-3 text-sm"><input className="mt-1 h-4 w-4 shrink-0" type="checkbox" checked={f.marketing} onChange={e => set("marketing", e.target.checked)} /><span>Desidero ricevere novità e promozioni (facoltativo).</span></label>
      <p className="text-xs text-cream/60">Stai inviando una richiesta: il tavolo sarà confermato dal ristorante. Nessun pagamento richiesto.</p>
      <button className="btn-gold min-h-12 w-full" disabled={busy || !f.time || loading || !!availabilityError}>{busy ? "Invio in corso…" : "Invia richiesta di prenotazione"}</button>
    </div>}
    {availabilityError && <div role="alert" className="space-y-2 rounded-xl border border-red-400/40 p-3 text-sm"><p>{availabilityError}</p><button type="button" onClick={() => setRefresh(n => n + 1)} className="text-gold underline">Riprova disponibilità</button></div>}
    {error && <p role="alert" className="rounded-xl bg-red-900/40 p-3 text-sm">{error}</p>}
    {step > 0 && <button type="button" disabled={busy} onClick={() => { setStep((step - 1) as Step); setError(""); }} className="btn-ghost min-h-12 w-full">Indietro</button>}
  </form>;
}
