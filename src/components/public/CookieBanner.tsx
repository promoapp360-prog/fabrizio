"use client";
import { useEffect, useState } from "react";
// Consenso cookie: GA4 si carica SOLO dopo consenso "statistiche".
export default function CookieBanner({ ga4 }: { ga4?: string }) {
  const [choice, setChoice] = useState<string | null>("pending");
  useEffect(() => { try { setChoice(localStorage.getItem("vc_consent")); } catch { setChoice(null); } }, []);
  useEffect(() => {
    if (choice !== "all" || !ga4 || document.getElementById("ga4")) return;
    const s = document.createElement("script"); s.id = "ga4"; s.async = true; s.src = `https://www.googletagmanager.com/gtag/js?id=${ga4}`; document.head.appendChild(s);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any; w.dataLayer = w.dataLayer || []; w.gtag = function () { w.dataLayer.push(arguments); }; w.gtag("js", new Date()); w.gtag("config", ga4, { anonymize_ip: true });
  }, [choice, ga4]);
  const save = (v: string) => { try { localStorage.setItem("vc_consent", v); } catch {} setChoice(v); };
  if (choice !== null) return null;
  return (
    <div role="dialog" aria-label="Preferenze cookie" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-2xl border border-gold/30 bg-coal p-5 shadow-2xl">
      <p className="text-sm text-cream/80">Usiamo cookie tecnici necessari. Con il tuo consenso useremo anche cookie statistici (Google Analytics) per migliorare il sito. <a href="/cookie" className="underline">Dettagli</a></p>
      <div className="mt-4 flex gap-3"><button className="btn-ghost !py-2 text-sm" onClick={() => save("necessary")}>Solo necessari</button><button className="btn-gold !py-2 text-sm" onClick={() => save("all")}>Accetta tutti</button></div>
    </div>
  );
}
