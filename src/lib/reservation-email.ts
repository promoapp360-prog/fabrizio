import { db } from "./db";
import { sendCommercialEmails } from "./commercial-email";

const labels: Record<string, string> = {
  PENDING: "In attesa di conferma", CONFIRMED: "Confermata", CANCELLED: "Annullata",
  SEATED: "Cliente arrivato", NO_SHOW: "Cliente non presentato", COMPLETED: "Conclusa", WAITLIST: "Lista d’attesa",
};

export async function sendReservationEmail(id: string, event = "RECEIVED", revision?: string, customerNotice = true) {
  const reservation = await db.reservation.findUniqueOrThrow({
    where: { id }, include: { customer: true, table: true },
  });
  const when = reservation.startsAt.toLocaleString("it-IT", { timeZone: "Europe/Rome", dateStyle: "long", timeStyle: "short" });
  const eventLabel = event === "RECEIVED" ? "Nuova prenotazione" : "Aggiornamento prenotazione";
  const subject = `Vecciarì · Prenotazione ${reservation.code} · ${eventLabel}`;
  const summary = [
    `Prenotazione ${reservation.code}`, `Data e ora: ${when} (ora italiana)`,
    `Persone: ${reservation.people}`, `Stato: ${labels[reservation.status] ?? reservation.status}`,
    reservation.table ? `Tavolo: ${reservation.table.number}` : "",
    reservation.notes ? `Note: ${reservation.notes}` : "",
  ].filter(Boolean).join("\n");
  const key = `reservation:${id}:${event}${revision ? `:${revision}` : ""}`;
  const customerSummary = [
    `Prenotazione ${reservation.code}`, `Data e ora: ${when} (ora italiana)`,
    `Persone: ${reservation.people}`, `Stato: ${labels[reservation.status] ?? reservation.status}`,
  ].join("\n");
  const result = await sendCommercialEmails(customerNotice && reservation.customer.email ? {
    to: reservation.customer.email, customerId: reservation.customerId, key, subject,
    body: `Ciao ${reservation.customer.name},\n${eventLabel} da Vecciarì.\n${customerSummary}\nPrenotazioni e assistenza: +39 393 138 0073`,
  } : null, {
    key, subject, customerId: reservation.customerId, body: [
      eventLabel, `Cliente: ${reservation.customer.name}`, `Telefono: ${reservation.customer.phone ?? "Non indicato"}`,
      reservation.customer.email ? `Email: ${reservation.customer.email}` : "",
      `Provenienza: ${reservation.source === "phone" ? "Telefonica" : reservation.source === "walk-in" ? "Ingresso diretto" : "Sito web"}`,
      summary,
    ].filter(Boolean).join("\n"),
  });
  return result.customer;
}
