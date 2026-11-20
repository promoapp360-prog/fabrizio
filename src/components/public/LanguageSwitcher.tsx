"use client";
import { useEffect, useRef, useState } from "react";
import { isLanguage, languages, type Language } from "@/lib/i18n/languages";
import { useLanguage } from "./LanguageProvider";

export default function LanguageSwitcher() {
  const { language, t, changing, changeLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const selected = languages.find(item => item.code === language) ?? languages[0];
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); button.current?.focus(); }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", keyboard);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", keyboard); };
  }, [open]);
  async function select(code: Language) {
    if (!isLanguage(code)) return;
    if (code === language) { setOpen(false); return; }
    setError("");
    try { await changeLanguage(code); setOpen(false); button.current?.focus(); }
    catch { setError("Impossibile cambiare lingua. Riprova."); }
  }
  return <div ref={root} className="language-switcher relative shrink-0" translate="no">
    <button ref={button} type="button" onClick={() => setOpen(value => !value)}
      className="flex min-h-10 min-w-10 items-center justify-center gap-1 rounded-full border border-gold/40 px-2 text-xs text-gold hover:bg-gold/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
      aria-label={t("Scegli la lingua")} aria-expanded={open} aria-controls="language-choices" disabled={changing} aria-busy={changing}>
      <span aria-hidden="true">{selected.flag}</span><span className="hidden min-[360px]:inline">{selected.code.toUpperCase()}</span>
      <span aria-hidden="true" className="text-[10px]">{open ? "▴" : "▾"}</span>
    </button>
    {open && <section id="language-choices" aria-label={t("Lingua")}
      className="language-choices fixed left-1/2 top-[calc(var(--site-header-height,64px)+12px)] z-[80] max-h-[min(70dvh,580px)] w-[min(92vw,420px)] -translate-x-1/2 overflow-y-auto rounded-2xl border border-gold/30 bg-coal p-4 shadow-2xl">
      <h2 className="mb-3 font-body text-xs tracking-widest text-gold">{t("Lingua")} / Language</h2>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {languages.map(item => <button key={item.code} type="button" lang={item.code} dir="auto" aria-pressed={item.code === language} disabled={changing}
          onClick={() => select(item.code)}
          className={`flex min-h-20 min-w-0 flex-col items-center justify-center gap-2 rounded-xl px-1 py-3 text-center text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold ${item.code === language ? "bg-gold text-ink" : "text-cream hover:bg-gold/10"}`}>
          <span aria-hidden="true" className="text-2xl">{item.flag}</span><span className="max-w-full break-words">{item.name}</span>
        </button>)}
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-red-300">{t(error)}</p>}
    </section>}
  </div>;
}
