"use client";
import { useEffect, useRef, useState } from "react";
import Translated from "./Translated";
import type { OnlinePaymentState } from "@/lib/payment-policy";

export default function PaymentPanel({ id, state, paidWithStripe, onChange, autoStart = false, onCheckoutStart, onCounterChoice }: {
  id: string; state: OnlinePaymentState; paidWithStripe: boolean; onChange: () => void; autoStart?: boolean;
  onCheckoutStart?: () => void; onCounterChoice?: () => void;
}) {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const attempted = useRef(false);
  useEffect(() => {
    if (autoStart && state === "ready" && !attempted.current) { attempted.current = true; void action(); }
    // One automatic attempt only; retry remains an explicit customer action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, state]);
  async function action(cancel = false) {
    if (!cancel) onCheckoutStart?.();
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/order/${id}/checkout`, { method: cancel ? "DELETE" : "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Pagamento non disponibile");
      if (result.url && !cancel) {
        const url = new URL(result.url);
        if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com") throw new Error("Indirizzo di pagamento non valido");
        window.location.assign(url.href);
      } else onChange();
    } catch (e) { setError(e instanceof Error ? e.message : "Connessione assente. Riprova."); onChange(); }
    finally { setBusy(false); }
  }
  return <Translated><section className="mt-5 rounded-xl border border-cream/15 p-4" aria-label="Pagamento ordine">
    <p role="status">{state === "paid" ? paidWithStripe ? "Pagamento online confermato da Stripe." : "Pagamento registrato dal personale."
      : state === "refunded" ? "Pagamento rimborsato. Contatta il ristorante per assistenza."
      : state === "cancelled" ? "Ordine annullato. Nessun nuovo pagamento disponibile."
      : state === "waiting_amount" ? "Potrai pagare online dopo la conferma del peso e dell’importo definitivo da parte del personale."
      : state === "waiting_restaurant" ? "Il pagamento online sarà disponibile dopo la conferma del ristorante o a fine pasto."
      : state === "pending" ? "Pagamento online aperto o in verifica. Non pagare nuovamente alla cassa finché il tentativo non è concluso o annullato."
      : state === "ready" ? "Scegli se pagare online con Stripe oppure alla cassa."
      : "Pagamento alla cassa. Nessun addebito online effettuato."}</p>
    {(state === "ready" || state === "pending") && <div className="mt-4 flex flex-wrap gap-3">
      <button type="button" className="btn-gold" disabled={busy} onClick={() => action()}>
        {busy ? "Attendi…" : state === "pending" ? "Riprendi pagamento online" : "Paga online con Stripe"}
      </button>
      {state === "pending" && <button type="button" className="btn-ghost" disabled={busy} onClick={() => action(true)}>Annulla tentativo online</button>}
    </div>}
    {onCounterChoice && !["pending", "paid", "refunded", "cancelled"].includes(state) &&
      <button type="button" className="btn-ghost mt-3" disabled={busy} onClick={onCounterChoice}>Paga alla cassa</button>}
    {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
    {(state === "ready" || state === "pending") && <p className="mt-3 text-xs text-cream/60">I dati della carta vengono inseriti soltanto su Stripe. Il ritorno al sito non conferma da solo il pagamento.</p>}
  </section></Translated>;
}
