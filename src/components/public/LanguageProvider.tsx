"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isLanguage, LANGUAGE_COOKIE, languageDirection, languages, type Dictionary, type Language } from "@/lib/i18n/languages";
import { makeTranslator } from "@/lib/i18n/translate";

const defaultValue = {
  language: "it" as Language, locale: "it-IT", t: (value: string) => value,
  changing: false, changeLanguage: async (_language: Language): Promise<void> => {},
};
const LanguageContext = createContext(defaultValue);

export function useLanguage() { return useContext(LanguageContext); }

export default function LanguageProvider({ language, dictionary, children }: {
  language: Language; dictionary: Dictionary; children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [active, setActive] = useState({ language, dictionary });
  const [changing, setChanging] = useState(false);
  const admin = pathname === "/admin" || pathname.startsWith("/admin/");
  useEffect(() => { setActive({ language, dictionary }); }, [language, dictionary]);
  const changeLanguage = useCallback(async (code: Language) => {
    if (!isLanguage(code)) throw new Error("Lingua non disponibile");
    setChanging(true);
    try {
      const response = await fetch(`/api/language/${code}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Impossibile cambiare lingua. Riprova.");
      const data = await response.json();
      if (data.language !== code || !data.dictionary || typeof data.dictionary !== "object") throw new Error("Impossibile cambiare lingua. Riprova.");
      document.cookie = `${LANGUAGE_COOKIE}=${code}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
      setActive({ language: code, dictionary: data.dictionary });
      // Refresh server content without discarding cart, form fields or focus.
      router.refresh();
    } finally { setChanging(false); }
  }, [router]);
  const value = useMemo(() => ({
    language: admin ? "it" as Language : active.language,
    locale: languages.find(item => item.code === (admin ? "it" : active.language))?.locale ?? "it-IT",
    t: makeTranslator(admin ? {} : active.dictionary),
    changing, changeLanguage,
  }), [active, admin, changing, changeLanguage]);
  useEffect(() => {
    document.documentElement.lang = value.language;
    document.documentElement.dir = languageDirection(value.language);
  }, [value.language]);
  useEffect(() => {
    if (admin) return;
    const saved = document.cookie.split("; ").find(item => item.startsWith(`${LANGUAGE_COOKIE}=`))?.split("=")[1];
    if (isLanguage(saved) && saved !== active.language) changeLanguage(saved).catch(() => {});
  }, [pathname, admin, active.language, changeLanguage]);
  useEffect(() => {
    const title = document.querySelector("title");
    if (!title) return;
    const update = () => {
      const translated = value.t(title.textContent ?? "");
      if (title.textContent !== translated) title.textContent = translated;
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(title, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, [value, pathname]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
