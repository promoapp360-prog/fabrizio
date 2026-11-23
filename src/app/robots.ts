import type { MetadataRoute } from "next";
import { SITE_ORIGIN } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/api/media/"],
      disallow: ["/admin/", "/api/", "/ordine/", "/t/"],
    },
    sitemap: new URL("/sitemap.xml", SITE_ORIGIN).toString(),
  };
}
