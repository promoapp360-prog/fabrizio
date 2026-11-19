import Link from "next/link";
import type { Settings } from "@/lib/settings";
export default function Footer({ s }: { s: Settings }) {
  const c = s.contacts;
  return (
    <footer className="border-t border-cream/10 bg-ink">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-3">
        <div><img src={s.brand.mark} alt="" className="h-16 w-auto" /><p className="mt-4 font-display text-xl uppercase">{s.brand.name}</p><p className="text-cream/60">{s.brand.motto}</p></div>
        <div className="space-y-1 text-cream/80"><p className="label">Dove siamo</p><p>{c.address}</p><p className="whitespace-pre-line">{c.hours}</p></div>
        <div className="space-y-2"><p className="label">Contatti</p>
          {c.phone && <a className="block hover:text-gold" href={`tel:${c.phone}`}>{c.phone}</a>}
          {c.whatsapp && <a className="block hover:text-gold" href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`}>WhatsApp</a>}
          {c.email && <a className="block hover:text-gold" href={`mailto:${c.email}`}>{c.email}</a>}
          <div className="flex gap-4 pt-2">{c.instagram && <a href={c.instagram} className="hover:text-gold">Instagram</a>}{c.facebook && <a href={c.facebook} className="hover:text-gold">Facebook</a>}{c.mapsUrl && <a href={c.mapsUrl} className="hover:text-gold">Google Maps</a>}</div>
        </div>
      </div>
      <div className="border-t border-cream/5 py-5 text-center text-xs text-cream/50">
        © {new Date().getFullYear()} {s.brand.name} · <Link href="/privacy" className="underline">Privacy</Link> · <Link href="/cookie" className="underline">Cookie</Link>
      </div>
    </footer>
  );
}
