import { StrictMode, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import OnlineOrder from "@/app/(site)/ordina/OnlineOrder";
import TableOrder from "@/app/t/[token]/TableOrder";
import OrderReceipt from "@/app/(site)/ordine/[id]/OrderReceipt";
import { menu, PHONE, TOKEN } from "../data";
import ReservationForm from "@/app/(site)/prenota/ReservationForm";
import NewYearEventTeaser from "@/components/public/NewYearEventTeaser";
import LanguageProvider from "@/components/public/LanguageProvider";
import es from "@/lib/i18n/dictionaries/es.json";
import he from "@/lib/i18n/dictionaries/he.json";
import "@/app/globals.css";

function subscribe(notify: () => void) {
  window.addEventListener("test:navigation", notify);
  window.addEventListener("popstate", notify);
  return () => {
    window.removeEventListener("test:navigation", notify);
    window.removeEventListener("popstate", notify);
  };
}

function App() {
  const pathname = useSyncExternalStore(subscribe, () => window.location.pathname);
  if (pathname === "/event-check") {
    const language = new URLSearchParams(window.location.search).get("lang") === "he" ? "he"
      : new URLSearchParams(window.location.search).get("lang") === "es" ? "es" : "it";
    return <LanguageProvider language={language} dictionary={language === "he" ? he : language === "es" ? es : {}}>
      <section className="restaurant-hero relative overflow-hidden bg-ink text-center">
        <div className="restaurant-hero-content relative mx-auto flex flex-col items-center px-5">
          <div className="hero-mark" /><h1 className="hero-name">VECCIARÌ</h1><p className="hero-location">MATERA</p>
          <div className="hero-actions relative flex flex-col justify-center">
            <a href="/prenota" className="btn-gold">Prenota</a><a href="/menu" className="btn-ghost">Scopri il menu</a>
            <NewYearEventTeaser />
          </div>
        </div>
      </section>
    </LanguageProvider>;
  }
  if (pathname === "/calendar-check")
    return <ReservationForm maxParty={10} phone="" whatsapp="" />;
  if (pathname.startsWith("/ordine/"))
    return <OrderReceipt id={pathname.split("/").pop()!} whatsapp={PHONE} />;
  if (pathname.startsWith("/t/"))
    return <TableOrder token={TOKEN} tableLabel="Tavolo 1" tableNumber={1} menu={menu}
      cooking={[]} orderingOn logo="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
      whatsapp={PHONE} />;
  return <OnlineOrder menu={menu} cooking={[]} table={false} takeaway delivery={false}
    prepMinutes={30} feeDelivery={0} minDelivery={0} zones="" whatsapp={PHONE} />;
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
