"use client";
import Link from "next/link";
import { useState } from "react";

const NAV = [["/ristorante", "Il ristorante"], ["/carne", "Mondo della carne"], ["/menu", "Menu"], ["/prenota", "Prenota"]] as const;

export default function Header({ logo, name, orderOnline }: { logo: string; name: string; orderOnline: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-cream/5 bg-ink/80 backdrop-blur">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:bg-gold focus:px-3 focus:py-1 focus:text-ink">Vai al contenuto</a>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2" aria-label={`${name} — home`}>
          <img src={logo} alt={name} className="h-11 w-auto" />
        </Link>
        <nav className="hidden items-center gap-7 md:flex" aria-label="Principale">
          {NAV.map(([h, l]) => <Link key={h} href={h} className="text-sm uppercase tracking-widest text-cream/80 hover:text-gold">{l}</Link>)}
          {orderOnline && <Link href="/ordina" className="text-sm uppercase tracking-widest text-cream/80 hover:text-gold">Ordina</Link>}
          <Link href="/prenota" className="btn-gold !py-2 text-sm">Prenota un tavolo</Link>
        </nav>
        <button className="md:hidden p-2" aria-expanded={open} aria-controls="mnav" aria-label="Apri menu" onClick={() => setOpen(!open)}>
          <span className="block h-0.5 w-6 bg-gold" /><span className="mt-1.5 block h-0.5 w-6 bg-gold" /><span className="mt-1.5 block h-0.5 w-4 bg-gold" />
        </button>
      </div>
      {open && (
        <nav id="mnav" className="border-t border-cream/10 bg-ink px-4 pb-6 md:hidden" aria-label="Mobile">
          {NAV.map(([h, l]) => <Link key={h} href={h} onClick={() => setOpen(false)} className="block py-3 font-display text-2xl uppercase">{l}</Link>)}
          {orderOnline && <Link href="/ordina" onClick={() => setOpen(false)} className="block py-3 font-display text-2xl uppercase">Ordina</Link>}
        </nav>
      )}
    </header>
  );
}
