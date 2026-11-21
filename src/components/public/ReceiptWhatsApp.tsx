"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Translated from "./Translated";
import PaymentPanel from "./PaymentPanel";
import type { OnlinePaymentState } from "@/lib/payment-policy";
import { FIXED_PORTIONS } from "@/lib/portions";
import { orderMessagePayment, readOrderWhatsAppDraft, saveOrderWhatsAppDraft,
  type OrderPaymentChoice, type OrderWhatsAppDraft } from "@/lib/order-whatsapp";
import { finishWhatsAppDraftWindow, openWhatsAppDraftWindow, orderWhatsAppMessage, whatsappDraftUrl } from "@/lib/whatsapp-draft";

type MessageOrder = {
  number: number; status: string; channel: string; tableNumber: number | null; pickupAt: string | null;
  finalCents: number | null; estimatedCents: number; hasWeighted: boolean; pricingPolicy: string;
  coverCount: number; coverUnitCents: number; paymentMethod: string; onlinePayment: OnlinePaymentState;
  payments: { status: string; method: string }[];
  items: { nameSnapshot: string; quantity: number; cooking: string | null; estWeightGrams: number | null; actualWeightGrams: number | null }[];
};

export function OrderWhatsAppNotice() {
  return <Translated><p className="mt-3 text-xs text-cream/60">Con Stripe, WhatsApp si apre solo dopo la conferma del pagamento. Alla cassa, il messaggio indica “Da pagare”. Il riepilogo include nome, prodotti e indirizzo di consegna, ma non email o telefono. Il messaggio parte solo se premi “Invia”.</p></Translated>;
}

export default function ReceiptWhatsApp({ id, order, whatsapp, verified, onChange }: {
  id: string; order: MessageOrder; whatsapp: string; verified: boolean; onChange: () => void;
}) {
  const [draft, setDraft] = useState<OrderWhatsAppDraft | null>(null);
  const [choice, setChoice] = useState<OrderPaymentChoice>("server");
  const [hydrated, setHydrated] = useState(false), [autoStart, setAutoStart] = useState(false);
  const [autoRequested, setAutoRequested] = useState(false);
  const attempted = useRef(new Set<string>());

  useEffect(() => {
    const saved = readOrderWhatsAppDraft(id);
    const query = new URLSearchParams(window.location.search);
    const returningFromStripe = query.has("pagamento");
    setDraft(saved);
    setChoice(query.get("pay") === "online" || returningFromStripe ? "STRIPE" : saved?.payment ?? "server");
    setAutoStart(query.get("pay") === "online");
    setAutoRequested(!!saved?.autoRequested || query.get("whatsapp") === "1" || query.get("pagamento") === "verifica");
    setHydrated(true);
  }, [id]);

  const payment = hydrated && verified ? orderMessagePayment(order, choice) : null;
  const message = payment ? orderWhatsAppMessage({
    number: order.number, channel: order.channel as "TABLE" | "TAKEAWAY" | "DELIVERY",
    tableNumber: order.tableNumber, pickupAt: order.pickupAt,
    pickupName: draft?.details?.pickupName, address: draft?.details?.address, notes: draft?.details?.notes,
    items: draft?.details?.items ?? order.items.map(item => ({
      name: item.nameSnapshot, quantity: item.quantity, cooking: item.cooking,
      weightGrams: order.pricingPolicy === FIXED_PORTIONS ? item.estWeightGrams : item.actualWeightGrams,
    })),
    totalCents: order.finalCents ?? order.estimatedCents, weighted: order.hasWeighted && order.finalCents == null,
    coverCount: order.coverCount, coverUnitCents: order.coverUnitCents, payment,
  }) : "";
  const url = message ? whatsappDraftUrl(whatsapp, message) : null;

  useEffect(() => {
    if (!payment || !url || !autoRequested) return;
    const attemptKey = `${id}:${payment}`;
    const stored = readOrderWhatsAppDraft(id);
    if (attempted.current.has(attemptKey) || stored?.attemptedStates.includes(payment)) return;
    // Mark before opening: effects, polling and refresh must not reopen the same message.
    attempted.current.add(attemptKey);
    const saved: OrderWhatsAppDraft = {
      ...(stored ?? { createdAt: Date.now(), payment: choice === "STRIPE" ? "STRIPE" : "AT_COUNTER", autoRequested: true, attemptedStates: [] }),
      attemptedStates: [...new Set([...(stored?.attemptedStates ?? []), payment])],
    };
    saveOrderWhatsAppDraft(id, saved);
    const current = new URL(window.location.href);
    current.searchParams.delete("whatsapp");
    if (current.searchParams.get("pagamento") === "verifica") current.searchParams.delete("pagamento");
    window.history.replaceState(window.history.state, "", current);
    finishWhatsAppDraftWindow(openWhatsAppDraftWindow(), whatsapp, message);
  }, [id, payment, url, message, autoRequested, choice, whatsapp]);

  function choosePayment(next: "STRIPE" | "AT_COUNTER") {
    setChoice(next);
    const saved: OrderWhatsAppDraft = {
      ...(readOrderWhatsAppDraft(id) ?? { createdAt: Date.now(), autoRequested: true, attemptedStates: [] }),
      payment: next,
    };
    saveOrderWhatsAppDraft(id, saved); setDraft(saved); setAutoRequested(true);
    if (next === "AT_COUNTER") {
      setAutoStart(false);
      const current = new URL(window.location.href);
      current.searchParams.delete("pay"); current.searchParams.delete("pagamento");
      window.history.replaceState(window.history.state, "", current);
    }
  }

  return <Translated><>
    <PaymentPanel id={id} state={order.onlinePayment} autoStart={hydrated && autoStart}
      paidWithStripe={order.payments.some(entry => entry.status === "PAID" && entry.method === "STRIPE")} onChange={onChange}
      onCheckoutStart={() => choosePayment("STRIPE")}
      onCounterChoice={choice === "STRIPE" || choice === "server" && order.paymentMethod === "STRIPE" ? () => choosePayment("AT_COUNTER") : undefined} />
    {whatsapp && url && <div className="mt-5 space-y-2">
      <a href={url} target="_blank" rel="noopener noreferrer" className="btn-ghost block w-full text-center">Apri WhatsApp</a>
      <p className="text-xs text-cream/50">Controlla il riepilogo precompilato e premi “Invia” per inoltrarlo al ristorante.</p>
    </div>}
    {whatsapp && !payment && !["paid", "refunded", "cancelled"].includes(order.onlinePayment) &&
      <p role="status" className="mt-4 text-sm text-cream/60">WhatsApp sarà disponibile dopo la conferma del pagamento online oppure dopo la scelta del pagamento alla cassa.</p>}
    <div className="mt-8 flex flex-wrap gap-3"><Link href={draft?.returnPath ?? "/ordina"} className="btn-gold">Nuovo ordine</Link><a href="tel:+393931380073" className="btn-ghost">Chiama il ristorante</a></div>
  </></Translated>;
}
