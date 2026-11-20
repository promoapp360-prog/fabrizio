import Translated from "@/components/public/ServerTranslated";
import Link from "next/link";
import type { Settings } from "@/lib/settings";
import { getMapsDirectionsUrl } from "@/lib/maps";
import CompanyDetails from "@/components/public/CompanyDetails";
export default function Footer({ s }: { s: Settings }) {
  const c = s.contacts;
  return <Translated>{(
    <footer className="border-t border-cream/10 bg-ink">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-3">
        <div><img src={s.brand.mark} alt="" className="h-16 w-auto" /><p className="mt-4 font-display text-xl uppercase">{s.brand.name}</p><p className="text-cream/60">{s.brand.motto}</p></div>
        <div className="space-y-1 text-cream/80"><p className="label">Dove siamo</p><p>{c.address}</p><p className="whitespace-pre-line">{c.hours}</p></div>
        <div className="space-y-2"><p className="label">Contatti</p>
          {c.phone && <a className="block hover:text-gold" href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}>Prenotazioni: {c.phone}</a>}
          {c.whatsapp && <a className="block hover:text-gold" href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`}>WhatsApp</a>}
          {c.email && <a className="block hover:text-gold" href={`mailto:${c.email}`}>{c.email}</a>}
          <div className="flex flex-wrap gap-4 pt-2">{c.instagram && <a href={c.instagram} className="hover:text-gold">Instagram</a>}{c.facebook && <a href={c.facebook} className="hover:text-gold">Facebook</a>}<a href={getMapsDirectionsUrl(c.address, c.mapsUrl)} target="_blank" rel="noopener noreferrer" className="hover:text-gold">Come arrivare</a></div>
        </div>
      </div>
      <div className="border-t border-cream/5 py-5 text-center text-xs text-cream/50">
        © {new Date().getFullYear()} {s.brand.name} · <Link href="/privacy" className="underline">Privacy</Link> · <Link href="/cookie" className="underline">Cookie</Link> · <Link href="/admin/login" className="underline hover:text-gold">Admin</Link>
        <div className="mx-auto mt-2 max-w-5xl px-4">
          <CompanyDetails compact />
        </div>
      </div>
      {c.whatsapp && <a
        href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`}
        target="_blank" rel="noopener noreferrer"
        aria-label="Prenota su WhatsApp" title="Prenota su WhatsApp"
        className="fixed bottom-6 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl transition hover:scale-105 hover:bg-[#1ebe5d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold md:right-6"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8" aria-hidden="true">
          <path d="M20.52 3.48A11.86 11.86 0 0 0 12.06 0C5.48 0 .12 5.35.12 11.93c0 2.1.55 4.15 1.6 5.96L0 24l6.26-1.64a11.94 11.94 0 0 0 5.8 1.48h.01c6.58 0 11.93-5.35 11.93-11.93 0-3.19-1.24-6.18-3.48-8.43ZM12.07 21.83a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.72.98 1-3.63-.24-.38a9.88 9.88 0 0 1-1.52-5.28c0-5.47 4.45-9.92 9.92-9.92a9.85 9.85 0 0 1 7.01 2.91 9.85 9.85 0 0 1 2.9 7.02c0 5.47-4.45 9.89-9.95 9.89Zm5.44-7.42c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.18.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.88-.79-1.48-1.76-1.66-2.06-.17-.3-.02-.46.13-.61l.45-.52c.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.67-1.61-.92-2.2-.24-.58-.48-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.48.71.31 1.27.5 1.7.63.72.23 1.37.2 1.89.12.57-.08 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35Z" />
        </svg>
      </a>}
    </footer>
  )}</Translated>;
}
