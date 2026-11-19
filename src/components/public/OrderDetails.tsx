"use client";

export type OrderDetailsValue = {
  name: string; phone: string; email: string; tableNumber: string;
  pickupAt: string; address: string; privacy: boolean;
};
export const emptyOrderDetails = (tableNumber?: number): OrderDetailsValue => ({
  name: "", phone: "", email: "", tableNumber: tableNumber?.toString() ?? "",
  pickupAt: "", address: "", privacy: false,
});

export default function OrderDetails({ value, onChange, channel, prepMinutes = 30, fixedTable = false }: {
  value: OrderDetailsValue; onChange: (v: OrderDetailsValue) => void;
  channel: "TABLE" | "TAKEAWAY" | "DELIVERY"; prepMinutes?: number; fixedTable?: boolean;
}) {
  const set = (key: keyof OrderDetailsValue, v: string | boolean) => onChange({ ...value, [key]: v });
  return <div className="mt-5 space-y-4">
    <h3 className="font-display text-lg uppercase">Dati per l’ordine</h3>
    {channel === "TABLE" && <label className="block"><span className="label">Numero del tavolo *</span>
      <input className="input" type="number" inputMode="numeric" min={1} max={999} required readOnly={fixedTable} value={value.tableNumber} onChange={e => set("tableNumber", e.target.value)} />
      {fixedTable && <span className="text-xs text-cream/60">Rilevato dal QR del tuo tavolo.</span>}
    </label>}
    <label className="block"><span className="label">{channel === "TAKEAWAY" ? "Nome di chi ritira *" : "Nome e cognome *"}</span>
      <input className="input" autoComplete="name" maxLength={80} required value={value.name} onChange={e => set("name", e.target.value)} /></label>
    <label className="block"><span className="label">Email per la conferma *</span>
      <input className="input" type="email" autoComplete="email" maxLength={160} required value={value.email} onChange={e => set("email", e.target.value)} /></label>
    <label className="block"><span className="label">Telefono *</span>
      <input className="input" type="tel" autoComplete="tel" maxLength={25} required value={value.phone} onChange={e => set("phone", e.target.value)} /></label>
    {channel !== "TABLE" && <label className="block"><span className="label">{channel === "TAKEAWAY" ? "Orario di ritiro *" : "Orario di consegna *"}</span>
      <input className="input" type="datetime-local" required value={value.pickupAt} onChange={e => set("pickupAt", e.target.value)} />
      <span className="text-xs text-cream/60">Almeno {prepMinutes} minuti di preavviso, entro 7 giorni.</span></label>}
    {channel === "DELIVERY" && <label className="block"><span className="label">Indirizzo di consegna *</span>
      <input className="input" autoComplete="street-address" required maxLength={200} value={value.address} onChange={e => set("address", e.target.value)} /></label>}
    <fieldset className="rounded-xl border border-cream/15 p-3">
      <legend className="px-1 font-display uppercase">Pagamento</legend>
      <p className="text-sm text-gold">Alla cassa {channel === "TAKEAWAY" ? "al momento del ritiro" : "del ristorante"}</p>
      <p className="mt-1 text-xs text-cream/60">Il personale registra il pagamento dopo aver confermato l’importo.</p>
      <label className="mt-3 flex items-center gap-2 text-sm text-cream/40"><input type="radio" disabled name="stripe-unavailable" /> Online con Stripe — non ancora attivo</label>
      <p className="mt-1 text-xs text-cream/50">Disponibile dopo il collegamento dell’account Vecciarì.</p>
    </fieldset>
    <label className="flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" required checked={value.privacy} onChange={e => set("privacy", e.target.checked)} />
      <span>Ho letto l’<a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline">informativa privacy</a> e autorizzo il trattamento dei dati necessario all’ordine. *</span></label>
    <p className="text-xs text-cream/50">I dati vengono usati per gestire l’ordine e le comunicazioni di servizio, non per il marketing.</p>
  </div>;
}
