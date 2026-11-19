import { getSettings } from "@/lib/settings";
import ReservationForm from "./ReservationForm";
export const metadata = { title: "Prenota un tavolo" };
export default async function Prenota() {
  const s = await getSettings();
  return (<div className="mx-auto max-w-xl px-4 py-16"><p className="text-xs uppercase tracking-[0.35em] text-gold">Prenotazioni</p><h1 className="mt-2 text-5xl">Prenota un tavolo</h1>
    <ReservationForm maxParty={s.reservations.maxPartyOnline} phone={s.contacts.phone} /></div>);
}
