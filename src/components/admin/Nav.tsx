"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
export default function Nav({ items, user }: { items: { href: string; label: string }[]; user: { name: string; role: string } }) {
  const path = usePathname(); const [open, setOpen] = useState(false);
  const logout = async () => { await fetch("/api/auth/logout", { method: "POST" }); location.href = "/admin/login"; };
  return (<>
    <button className="fixed left-3 top-3 z-50 rounded bg-coal p-2 lg:hidden no-print" onClick={() => setOpen(!open)} aria-label="Menu gestionale">☰</button>
    <aside className={`no-print fixed inset-y-0 left-0 z-40 w-60 overflow-y-auto border-r border-cream/10 bg-coal p-4 transition lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
      <img src="/brand/logo-naming-oro.webp" alt="Vecciarì" className="mx-auto mt-6 h-14 lg:mt-0" />
      <nav className="mt-6 space-y-0.5">{items.map(i => <Link key={i.href} href={i.href} onClick={() => setOpen(false)} className={`block rounded-lg px-3 py-2 text-sm ${path === i.href || (i.href !== "/admin" && path.startsWith(i.href)) ? "bg-gold text-ink" : "text-cream/80 hover:bg-ink"}`}>{i.label}</Link>)}</nav>
      <div className="mt-6 border-t border-cream/10 pt-4 text-xs text-cream/60"><p>{user.name}</p><p>{user.role}</p><button onClick={logout} className="mt-2 text-gold underline">Esci</button> · <a href="/" target="_blank" className="underline">Sito</a></div>
    </aside></>);
}
