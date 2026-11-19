import "./globals.css";
import type { Metadata, Viewport } from "next";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return { title: { default: s.seo.title, template: `%s · ${s.brand.name}` }, description: s.seo.description,
    metadataBase: new URL(process.env.PUBLIC_BASE_URL || "http://localhost:3000"),
    icons: { icon: s.brand.favicon, apple: "/icon-192.png" }, manifest: "/manifest.webmanifest",
    openGraph: { title: s.seo.title, description: s.seo.description, images: [s.brand.logo], locale: "it_IT", type: "website" } };
}
export const viewport: Viewport = { themeColor: "#0A0A08", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { brand } = await getSettings();
  const c = brand.colors;
  const vars = `:root{--c-ink:${c.ink};--c-coal:${c.coal};--c-gold:${c.gold};--c-gold-deep:${c.goldDeep};--c-cream:${c.cream};}`;
  return (
    <html lang="it">
      <head><style dangerouslySetInnerHTML={{ __html: vars }} /></head>
      <body>{children}</body>
    </html>
  );
}
