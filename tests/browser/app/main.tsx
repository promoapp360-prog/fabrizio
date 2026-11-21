import { StrictMode, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import OnlineOrder from "@/app/(site)/ordina/OnlineOrder";
import TableOrder from "@/app/t/[token]/TableOrder";
import OrderReceipt from "@/app/(site)/ordine/[id]/OrderReceipt";
import { menu, PHONE, TOKEN } from "../data";
import ReservationForm from "@/app/(site)/prenota/ReservationForm";
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
