import type { Metadata } from "next";
import { getDictionary, getLanguage } from "@/lib/i18n/server";
import { languages } from "@/lib/i18n/languages";
import { makeTranslator } from "@/lib/i18n/translate";
import { SEO_IMAGE, SITE_ORIGIN, canonicalPath } from "@/lib/seo";

type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
  image?: string;
  appendMatera?: boolean;
};

export async function createPageMetadata({
  title,
  description,
  path,
  type = "website",
  image = SEO_IMAGE,
  appendMatera = false,
}: PageMetadataInput): Promise<Metadata> {
  const language = await getLanguage();
  const t = makeTranslator(await getDictionary(language));
  const translatedTitle = `${t(title)}${appendMatera ? ` ${t("a Matera")}` : ""}`;
  const displayTitle = `${translatedTitle} · Vecciarì`;
  const localizedDescription = t(description);
  const canonical = new URL(canonicalPath(path), SITE_ORIGIN).toString();
  const imageMetadata = {
    url: image,
    width: 1200,
    height: 630,
    alt: "Vecciarì – Grano & Brace, ristorante a Matera",
  };

  return {
    title: translatedTitle,
    description: localizedDescription,
    alternates: { canonical },
    openGraph: {
      siteName: "Vecciarì",
      title: displayTitle,
      description: localizedDescription,
      url: canonical,
      locale: (languages.find(item => item.code === language)?.locale ?? "it-IT").replace(/-/g, "_"),
      type,
      images: [imageMetadata],
    },
    twitter: {
      card: "summary_large_image",
      title: displayTitle,
      description: localizedDescription,
      images: [imageMetadata],
    },
  };
}
