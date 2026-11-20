import Translated from "@/components/public/ServerTranslated";
import { getSettings } from "@/lib/settings";
import ReservationForm from "./ReservationForm";
type Search = Promise<{ richiesta?: string }>;
export async function generateMetadata({ searchParams }: { searchParams: Search }) {
  return { title: "Prenota un tavolo", ...((await searchParams).richiesta ? { robots: { index: false, follow: false } } : {}) };
}
export default async function Prenota({ searchParams }: { searchParams: Search }) {
  const s = await getSettings();
  const { richiesta } = await searchParams;
  return <Translated>{(<div className="mx-auto max-w-xl px-4 py-16"><p className="text-xs uppercase tracking-[0.35em] text-gold">Prenotazioni</p><h1 className="mt-2 text-5xl">Prenota un tavolo</h1>
    {s.contacts.phone && <p className="mt-5 text-cream/75">Preferisci chiamare? <a className="text-gold underline" href={`tel:${s.contacts.phone.replace(/[^\d+]/g, "")}`}>{s.contacts.phone}</a></p>}
    <p className="mt-4 whitespace-pre-line text-sm text-cream/70">{s.contacts.hours}</p>
    <ReservationForm maxParty={s.reservations.maxPartyOnline} phone={s.contacts.phone} whatsapp={s.contacts.whatsapp} initialReceiptId={richiesta} /></div>)}</Translated>;
}
