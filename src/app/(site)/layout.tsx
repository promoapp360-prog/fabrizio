import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import CookieBanner from "@/components/public/CookieBanner";
import { getSettings } from "@/lib/settings";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  const ld = { "@context": "https://schema.org", "@type": "Restaurant", name: s.brand.name, servesCuisine: "Carne alla brace", address: s.contacts.address, telephone: s.contacts.phone || undefined, url: process.env.PUBLIC_BASE_URL, acceptsReservations: true, menu: `${process.env.PUBLIC_BASE_URL}/menu` };
  return (<>
    <Header logo={s.brand.mark} name={s.brand.name} orderOnline={s.ordering.takeawayEnabled || s.ordering.deliveryEnabled} />
    <main id="main" className="pt-16">{children}</main>
    <Footer s={s} />
    <CookieBanner ga4={process.env.NEXT_PUBLIC_GA4_ID} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
  </>);
}
