import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { NEW_YEAR_EVENT } from "@/lib/new-year-event";
import { SITE_ORIGIN } from "@/lib/seo";

export const dynamic = "force-dynamic";

const publicPages = [
  { path: "/", priority: 1 },
  { path: "/ristorante", priority: 0.8 },
  { path: "/storia", priority: 0.8 },
  { path: "/menu", priority: 0.9 },
  { path: "/prenota", priority: 0.8 },
  { path: "/carne", priority: 0.8 },
  { path: "/privacy", priority: 0.2 },
  { path: "/cookie", priority: 0.2 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getSettings();
  const orderingEnabled = settings.ordering.tableEnabled || settings.ordering.takeawayEnabled || settings.ordering.deliveryEnabled;
  const entries: MetadataRoute.Sitemap = publicPages.map(({ path, priority }) => ({
    url: new URL(path, SITE_ORIGIN).toString(),
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority,
  }));

  if (orderingEnabled) {
    entries.push({ url: new URL("/ordina", SITE_ORIGIN).toString(), changeFrequency: "weekly", priority: 0.8 });
  }

  if (new Date(`${NEW_YEAR_EVENT.date}T23:59:59+01:00`).getTime() >= Date.now()) {
    entries.push({ url: new URL(NEW_YEAR_EVENT.path, SITE_ORIGIN).toString(), changeFrequency: "weekly", priority: 0.8 });
  }

  const [breeds, cuts] = await Promise.all([
    db.breed.findMany({ where: { published: true, isDemo: false }, select: { slug: true } }),
    db.cut.findMany({ where: { published: true, isDemo: false }, select: { slug: true } }),
  ]);

  entries.push(...breeds.map(({ slug }) => ({
    url: new URL(`/carne/razze/${encodeURIComponent(slug)}`, SITE_ORIGIN).toString(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  })));
  entries.push(...cuts.map(({ slug }) => ({
    url: new URL(`/carne/tagli/${encodeURIComponent(slug)}`, SITE_ORIGIN).toString(),
    changeFrequency: "monthly" as const,
    priority: 0.5,
  })));
  return entries;
}
