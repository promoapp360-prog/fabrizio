import { RESTAURANT_HOURS } from "@/lib/restaurant-content";
import { SEO_IMAGE, SITE_ORIGIN } from "@/lib/seo";

type RestaurantDetails = {
  name: string;
  description: string;
  address: string;
  phone?: string;
  mapsUrl?: string;
  instagram?: string;
  facebook?: string;
  hours: string;
};

const openingHours = [
  { "@type": "OpeningHoursSpecification", dayOfWeek: ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], opens: "12:00", closes: "15:00" },
  { "@type": "OpeningHoursSpecification", dayOfWeek: ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], opens: "19:00", closes: "23:00" },
];

export function createRestaurantSchema(details: RestaurantDetails) {
  const parts = /^(.+?),\s*(\d{5})\s+(.+)$/u.exec(details.address.trim());
  const address = parts
    ? {
        "@type": "PostalAddress",
        streetAddress: parts[1],
        postalCode: parts[2],
        addressLocality: parts[3],
        addressCountry: "IT",
      }
    : {
        "@type": "PostalAddress",
        streetAddress: details.address,
        addressLocality: "Matera",
        addressCountry: "IT",
      };
  const sameAs = [details.mapsUrl, details.instagram, details.facebook].filter((value): value is string => !!value);

  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": `${SITE_ORIGIN}/#restaurant`,
    name: details.name,
    description: details.description,
    url: SITE_ORIGIN,
    image: [new URL(SEO_IMAGE, SITE_ORIGIN).toString()],
    logo: new URL("/brand/logo-naming-oro.webp", SITE_ORIGIN).toString(),
    servesCuisine: ["Carne alla brace", "Cucina materana"],
    address,
    ...(details.phone ? { telephone: details.phone } : {}),
    ...(details.mapsUrl ? { hasMap: details.mapsUrl } : {}),
    sameAs,
    acceptsReservations: true,
    menu: new URL("/menu", SITE_ORIGIN).toString(),
    ...(details.hours === RESTAURANT_HOURS ? { openingHoursSpecification: openingHours } : {}),
  };
}
