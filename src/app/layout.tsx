import "./globals.css";
import type { Metadata, Viewport } from "next";
import { getSettings } from "@/lib/settings";
import { getDictionary, getLanguage } from "@/lib/i18n/server";
import { languageDirection, languages } from "@/lib/i18n/languages";
import { makeTranslator } from "@/lib/i18n/translate";
import LanguageProvider from "@/components/public/LanguageProvider";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const language = await getLanguage();
  const t = makeTranslator(await getDictionary(language));
  return { title: { default: t(s.seo.title), template: `%s · ${s.brand.name}` }, description: t(s.seo.description),
    metadataBase: new URL(process.env.PUBLIC_BASE_URL || "http://localhost:3000"),
    icons: { icon: s.brand.favicon, apple: "/icon-192.png" }, manifest: "/manifest.webmanifest",
    openGraph: { title: t(s.seo.title), description: t(s.seo.description), images: [s.brand.logo], locale: (languages.find(item => item.code === language)?.locale ?? "it-IT").replace(/-/g, "_"), type: "website" } };
}
export const viewport: Viewport = { themeColor: "#0A0A08", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { brand } = await getSettings();
  const language = await getLanguage();
  const dictionary = await getDictionary(language);
  const c = brand.colors;
  const vars = { "--c-ink": c.ink, "--c-coal": c.coal, "--c-gold": c.gold, "--c-gold-deep": c.goldDeep, "--c-cream": c.cream } as React.CSSProperties;
  return (
    <html lang={language} dir={languageDirection(language)} style={vars}>
      <body><LanguageProvider language={language} dictionary={dictionary}>{children}</LanguageProvider></body>
    </html>
  );
}
