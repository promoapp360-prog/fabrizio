"use client";
import Translated from "@/components/public/Translated";
import { useState } from "react";
import { useRouter } from "next/navigation";
import MenuBrowser, { type CartLine } from "@/components/public/MenuBrowser";
import CartPanel from "@/components/public/CartPanel";
import OrderDetails, { emptyOrderDetails } from "@/components/public/OrderDetails";
import type { MenuData } from "@/lib/menu";
import { customerOrderSchema } from "@/lib/checkout";
import { useLiveCart } from "@/components/public/useLiveCart";
import { useMenuRefresh } from "@/components/public/useMenuRefresh";
import { formatEUR } from "@/lib/pricing";
import DiningPartySetup from "@/components/public/DiningPartySetup";
import { useDiningParty } from "@/components/public/useDiningParty";
import { saveOrderWhatsAppDraft } from "@/lib/order-whatsapp";
import { OrderWhatsAppNotice } from "@/components/public/ReceiptWhatsApp";

export default function OnlineOrder(p: { menu: MenuData; cooking: string[]; table: boolean; takeaway: boolean; delivery: boolean; prepMinutes: number; feeDelivery: number; minDelivery: number; zones: string; whatsapp: string }) {
  useMenuRefresh();
  const router = useRouter();
  const [cart, setCart] = useState<CartLine[]>([]), [notes, setNotes] = useState(""), [busy, setBusy] = useState(false);
  const [channel, setChannel] = useState<"TABLE" | "TAKEAWAY" | "DELIVERY">(p.table ? "TABLE" : p.takeaway ? "TAKEAWAY" : "DELIVERY");
  const [details, setDetails] = useState(() => emptyOrderDetails());
  const party = useDiningParty(Number(details.tableNumber), channel === "TABLE");
  const coverCount = channel === "TABLE" ? party.coverCount : 0;
  const coverCents = channel === "TABLE" ? party.coverCents : 0;
  const totalCents = cart.reduce((sum, line) => sum + line.estCents, 0) + coverCents + (channel === "DELIVERY" ? p.feeDelivery : 0);
  const [error, setError] = useState(""), [idem] = useState(() => crypto.randomUUID());
  const menu = { ...p.menu, products: p.menu.products.filter(product => product.channels.includes(channel)).map(product => ({
    ...product, priceCents: channel === "TABLE" ? product.basePriceCents : product.takeawayPriceCents ?? product.basePriceCents,
  })) };
  const menuNotice = useLiveCart(menu, cart, setCart, channel);
  async function submit() {
    setError("");
    const parsed = customerOrderSchema.safeParse(details);
    if (!parsed.success) { setError("Inserisci nome, email e telefono validi e accetta l’informativa privacy."); return; }
    if (channel === "TABLE" && (!Number.isInteger(Number(details.tableNumber)) || Number(details.tableNumber) < 1)) { setError("Inserisci il numero del tavolo."); return; }
    if (channel === "TABLE" && (!party.ready || !party.confirmed)) { setError("Indica per quante persone stai ordinando e conferma i coperti."); return; }
    const pickup = channel === "TABLE" ? undefined : new Date(details.pickupAt);
    if (pickup && !Number.isFinite(pickup.getTime())) { setError("Scegli l’orario di ritiro."); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/online-order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        ...parsed.data, channel, idempotencyKey: idem, notes: notes || undefined,
        tableNumber: channel === "TABLE" ? Number(details.tableNumber) : undefined,
        diningGroupKey: channel === "TABLE" ? party.key : undefined, partySize: channel === "TABLE" ? party.people : undefined,
        coverQuoteCents: channel === "TABLE" ? coverCents : undefined, expectedTotalCents: totalCents,
        pickupAt: pickup?.toISOString(), address: channel === "DELIVERY" ? details.address : undefined,
        payment: details.payment === "STRIPE" ? "STRIPE" : channel === "TABLE" ? "AT_COUNTER" : "ON_PICKUP",
        items: cart.map(l => ({ productId: l.productId, quantity: l.quantity, cooking: l.cooking, optionIds: l.optionIds, notes: l.notes, weightGrams: l.weightGrams })),
      }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Ordine non inviato");
      if (p.whatsapp) saveOrderWhatsAppDraft(j.id, {
        createdAt: Date.now(), payment: details.payment, autoRequested: true, attemptedStates: [],
        details: { pickupName: details.name, address: channel === "DELIVERY" ? details.address : undefined, notes,
          items: cart.map(line => ({ name: line.name, quantity: line.quantity, cooking: line.cooking, options: line.optionNames, notes: line.notes, weightGrams: line.weightGrams })) },
      });
      // Retain the cart until navigation succeeds; retries reuse the same key.
      router.push(`/ordine/${j.id}?whatsapp=1${details.payment === "STRIPE" && j.totalCents === totalCents ? "&pay=online" : ""}`);
    } catch (e) { party.refresh(); setError(e instanceof Error ? e.message : "Connessione assente. Puoi riprovare senza duplicare l’ordine."); setBusy(false); }
  }
  const modes = [
    ...(p.table ? [{ id: "TABLE" as const, label: "Al tavolo" }] : []),
    ...(p.takeaway ? [{ id: "TAKEAWAY" as const, label: "Asporto" }] : []),
    ...(p.delivery ? [{ id: "DELIVERY" as const, label: "Consegna" }] : []),
  ];
  return <Translated>{<div className="mx-auto max-w-6xl px-4 py-10">
    <h1 className="text-4xl md:text-5xl">Il tuo ordine</h1>
    <p className="mt-3 text-sm text-cream/60">Scegli la modalità, aggiungi i prodotti e completa i tuoi dati.</p>
    <div className="my-6 flex flex-wrap gap-3" aria-label="Modalità ordine">{modes.map(m => <button key={m.id} aria-pressed={channel === m.id} disabled={busy} onClick={() => { setChannel(m.id); setError(""); }} className={channel === m.id ? "btn-gold" : "btn-ghost"}>{m.label}</button>)}</div>
    {channel === "TABLE" && <DiningPartySetup party={party} table={details.tableNumber} onTableChange={tableNumber => setDetails({ ...details, tableNumber })} />}
    {(channel !== "TABLE" || party.confirmed) && <fieldset disabled={busy} className="min-w-0">
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0">{menuNotice && <p role="status" className="my-3 rounded-lg border border-gold/30 p-3 text-sm">{menuNotice}</p>}<MenuBrowser menu={menu} cooking={p.cooking} cartEnabled cart={cart} liveRefresh={false} onCartChange={setCart} /></div>
      <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <CartPanel cart={cart} setCart={setCart} notes={notes} setNotes={setNotes} busy={busy} onSubmit={submit} feeCents={channel === "DELIVERY" ? p.feeDelivery : 0}
          coverCount={coverCount} coverUnitCents={party.coverUnitCents} disabled={channel === "TABLE" && !party.ready}
          cta={details.payment === "STRIPE" ? "Conferma ordine e paga online" : "Conferma ordine · paga alla cassa"}>
          <OrderDetails value={details} onChange={value => { setDetails(value); setError(""); }} channel={channel} prepMinutes={p.prepMinutes} />
          {p.whatsapp && <OrderWhatsAppNotice />}
          {channel === "DELIVERY" && <p className="mt-3 text-xs text-cream/60">Minimo {formatEUR(p.minDelivery)} · Consegna {formatEUR(p.feeDelivery)}{p.zones && ` · Zone: ${p.zones}`}</p>}
          {error && <p role="alert" className="mt-3 rounded bg-red-900/50 p-3 text-sm">{error}</p>}
        </CartPanel>
      </aside>
    </div></fieldset>}
  </div>}</Translated>;
}
