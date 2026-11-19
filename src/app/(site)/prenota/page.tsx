import { getSettings } from "@/lib/settings";
import ReservationForm from "./ReservationForm";
export const metadata = { title: "Prenota un tavolo" };
export default async function Prenota() {
  const s = await getSettings();
  return (<div className="mx-auto max-w-xl px-4 py-16"><p className="text-xs uppercase tracking-[0.35em] text-gold">Prenotazioni</p><h1 className="mt-2 text-5xl">Prenota un tavolo</h1>
    {s.contacts.phone && <p className="mt-5 text-cream/75">Preferisci chiamare? <a className="text-gold underline" href={`tel:${s.contacts.phone.replace(/[^\d+]/g, "")}`}>{s.contacts.phone}</a></p>}
    <p className="mt-4 whitespace-pre-line text-sm text-cream/70">{s.contacts.hours}</p>
    <ReservationForm maxParty={s.reservations.maxPartyOnline} phone={s.contacts.phone} /></div>);
}
