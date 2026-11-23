import Translated from "@/components/public/ServerTranslated";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import CookieBanner from "@/components/public/CookieBanner";
import { getSettings } from "@/lib/settings";
import { createRestaurantSchema } from "@/lib/restaurant-schema";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  const ld = createRestaurantSchema({ name: s.brand.name, description: s.seo.description, address: s.contacts.address, phone: s.contacts.phone, mapsUrl: s.contacts.mapsUrl, instagram: s.contacts.instagram, facebook: s.contacts.facebook, hours: s.contacts.hours });
  return <Translated>{(<>
    <Header logo={s.brand.mark} name={s.brand.name} orderOnline={s.ordering.tableEnabled || s.ordering.takeawayEnabled || s.ordering.deliveryEnabled} />
    <main id="main" className="site-main pt-16">{children}</main>
    <Footer s={s} />
    <CookieBanner ga4={process.env.NEXT_PUBLIC_GA4_ID} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
  </>)}</Translated>;
}
