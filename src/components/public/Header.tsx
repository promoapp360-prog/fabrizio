"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const NAV = [["/ristorante", "Il ristorante"], ["/carne", "Mondo della carne"], ["/menu", "Menu"], ["/prenota", "Prenota"]] as const;

export default function Header({ logo, name, orderOnline }: { logo: string; name: string; orderOnline: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const header = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLElement>(null);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);
  useEffect(() => {
    if (!open) return;
    const body = document.body;
    const y = window.scrollY;
    const previous = { position: body.style.position, top: body.style.top, width: body.style.width, overflow: body.style.overflow };
    body.style.position = "fixed";
    body.style.top = `-${y}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    const main = document.getElementById("main");
    const wasInert = main?.inert ?? false;
    if (main) main.inert = true;
    menu.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); return; }
      if (event.key !== "Tab") return;
      const items = Array.from(header.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [])
        .filter(element => element.getClientRects().length > 0);
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", keyboard);
    return () => {
      document.removeEventListener("keydown", keyboard);
      Object.assign(body.style, previous);
      if (main) main.inert = wasInert;
      window.scrollTo({ top: y, behavior: "instant" });
      toggle.current?.focus({ preventScroll: true });
    };
  }, [open]);

  return (
    <header ref={header} role={open ? "dialog" : undefined} aria-modal={open || undefined} aria-label={open ? "Menu di navigazione" : undefined}
      className={`site-header fixed inset-x-0 top-0 z-[60] border-b border-cream/5 bg-ink lg:z-40 lg:bg-ink/80 lg:backdrop-blur ${pathname === "/" ? "site-header--home" : ""}`}>
      {!open && <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:bg-gold focus:px-3 focus:py-1 focus:text-ink">Vai al contenuto</a>}
      <div className="site-header-row mx-auto flex max-w-7xl items-center justify-between px-4">
        <Link href="/" onClick={() => setOpen(false)} className="header-brand flex shrink-0 items-center gap-2 whitespace-nowrap" aria-label={`${name} — home`}>
          <img src={logo} alt="" className="header-brand-mark h-10 w-auto" />
          <span className="header-brand-name font-display text-lg uppercase tracking-wide">VECCIARÍ<span className="header-brand-subtitle block font-body text-[8px] font-normal tracking-[0.22em] text-gold lg:font-display">GRANO &amp; BRACE – MATERA</span></span>
        </Link>
        <nav className="hidden items-center gap-5 lg:flex" aria-label="Principale">
          {NAV.map(([h, l]) => <Link key={h} href={h} className="text-sm uppercase tracking-widest text-cream/80 hover:text-gold">{l}</Link>)}
          {orderOnline && <Link href="/ordina" className="text-sm uppercase tracking-widest text-cream/80 hover:text-gold">Ordina</Link>}
          <Link href="/prenota" className="btn-gold !py-2 text-sm">Prenota un tavolo</Link>
        </nav>
        <button ref={toggle} className="mobile-menu-toggle relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold lg:hidden"
          aria-expanded={open} aria-controls="mnav" aria-label={open ? "Chiudi menu" : "Apri menu"} onClick={() => setOpen(value => !value)}>
          {open ? <span aria-hidden="true"><span className="absolute left-2.5 top-[21px] h-0.5 w-6 rotate-45 bg-gold" /><span className="absolute left-2.5 top-[21px] h-0.5 w-6 -rotate-45 bg-gold" /></span>
            : <span aria-hidden="true"><span className="block h-0.5 w-6 bg-gold" /><span className="mt-1.5 block h-0.5 w-6 bg-gold" /><span className="mt-1.5 block h-0.5 w-6 bg-gold" /></span>}
        </button>
      </div>
      {open && (
        <>
          <button type="button" className="mobile-nav-backdrop" aria-label="Chiudi menu" onClick={() => setOpen(false)} />
          <nav ref={menu} id="mnav" className="mobile-nav-panel border-t border-cream/10 bg-ink lg:hidden" aria-label="Mobile">
            {NAV.map(([h, l]) => <Link key={h} href={h} onClick={() => setOpen(false)} className="mobile-nav-link" aria-current={pathname === h ? "page" : undefined}>{l}</Link>)}
            {orderOnline && <Link href="/ordina" onClick={() => setOpen(false)} className="mobile-nav-link" aria-current={pathname === "/ordina" ? "page" : undefined}>Ordina</Link>}
          </nav>
        </>
      )}
    </header>
  );
}
