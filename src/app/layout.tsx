import "./globals.css";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { getSettings } from "@/lib/settings";
import { getDictionary, getLanguage } from "@/lib/i18n/server";
import { languageDirection, languages } from "@/lib/i18n/languages";
import { makeTranslator } from "@/lib/i18n/translate";
import LanguageProvider from "@/components/public/LanguageProvider";
import { SEO_IMAGE, SITE_ORIGIN, canonicalPath } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const language = await getLanguage();
  const t = makeTranslator(await getDictionary(language));
  const pathname = (await headers()).get("x-vecciari-pathname") || "/";
  const canonical = new URL(canonicalPath(pathname), SITE_ORIGIN).toString();
  const title = t(s.seo.title);
  const description = t(s.seo.description);
  const image = { url: SEO_IMAGE, width: 1200, height: 630, alt: "Vecciarì – Grano & Brace, ristorante a Matera" };
  return { title: { default: title, template: `%s · ${s.brand.name}` }, description,
    metadataBase: new URL(SITE_ORIGIN), alternates: { canonical },
    icons: { icon: s.brand.favicon, shortcut: s.brand.favicon, apple: "/icon-192.png" }, manifest: "/manifest.webmanifest",
    openGraph: { siteName: s.brand.name, title, description, url: canonical, images: [image], locale: (languages.find(item => item.code === language)?.locale ?? "it-IT").replace(/-/g, "_"), type: "website" },
    twitter: { card: "summary_large_image", title, description, images: [image] } };
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
