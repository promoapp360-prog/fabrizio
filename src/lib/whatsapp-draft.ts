import { formatEUR } from "./pricing";

export type WhatsAppOrderLine = {
  name: string;
  quantity: number;
  cooking?: string | null;
  options?: string[];
  notes?: string | null;
  weightGrams?: number | null;
};

export function whatsappDraftUrl(phone: string, message: string): string | null {
  const recipient = phone.replace(/\D/g, "");
  if (recipient.length < 8 || recipient.length > 15 || !message.trim()) return null;
  return `https://wa.me/${recipient}?text=${encodeURIComponent(message)}`;
}

export function openWhatsAppDraftWindow(): Window | null {
  if (typeof window === "undefined") return null;
  try {
    // Open while the submit click still counts as a user gesture. The final
    // wa.me URL is filled in only after the order/request is saved successfully.
    const target = window.open("about:blank", "_blank");
    if (target) {
      target.document.title = "Vecciarì · WhatsApp";
      target.document.body.textContent = "Preparazione del riepilogo. WhatsApp si aprirà dopo la conferma.";
    }
    return target;
  } catch {
    return null;
  }
}

export function finishWhatsAppDraftWindow(target: Window | null, phone: string, message: string): boolean {
  const url = whatsappDraftUrl(phone, message);
  if (!url || !target || target.closed) {
    try { target?.close(); } catch { /* Ignore an already-closed popup. */ }
    return false;
  }
  try {
    target.location.replace(url);
    return true;
  } catch {
    try { target.close(); } catch { /* Ignore an already-closed popup. */ }
    return false;
  }
}

export function closeWhatsAppDraftWindow(target: Window | null): void {
  try { if (target && !target.closed) target.close(); } catch { /* Ignore an already-closed popup. */ }
}

export function reservationWhatsAppMessage(input: {
  code: string;
  date: string;
  time: string;
  people: number;
}): string {
  const date = new Date(`${input.date}T12:00:00`).toLocaleDateString("it-IT", {
    timeZone: "Europe/Rome", weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  return `Buongiorno Vecciarì, ho appena inviato una richiesta di prenotazione. Codice ${input.code}: ${date}, ore ${input.time}, ${input.people} persone. Potete confermarmi il tavolo?`;
}

export function orderWhatsAppMessage(input: {
  number: number;
  channel: "TABLE" | "TAKEAWAY" | "DELIVERY";
  tableNumber?: number | null;
  pickupAt?: string | Date | null;
  pickupName?: string;
  address?: string;
  items: WhatsAppOrderLine[];
  totalCents: number;
  weighted?: boolean;
  notes?: string;
  coverCount?: number;
  coverUnitCents?: number;
  payment?: string;
}): string {
  const mode = input.channel === "TABLE" ? "Al tavolo" : input.channel === "TAKEAWAY" ? "Asporto" : "Consegna";
  const lines = ["Buongiorno Vecciarì, ho appena inviato un ordine.", `Ordine n° ${input.number}`, `Modalità: ${mode}`];
  if (input.tableNumber) lines.push(`Tavolo: ${input.tableNumber}`);
  if (input.pickupName?.trim()) lines.push(`Nome: ${input.pickupName.trim()}`);
  if (input.pickupAt) {
    const pickup = new Date(input.pickupAt).toLocaleString("it-IT", {
      timeZone: "Europe/Rome", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
    });
    lines.push(`${input.channel === "DELIVERY" ? "Consegna" : "Ritiro"}: ${pickup}`);
  }
  if (input.channel === "DELIVERY" && input.address?.trim()) lines.push(`Indirizzo: ${input.address.trim()}`);
  lines.push("Prodotti:", ...input.items.map(item => {
    const details = [item.weightGrams ? `${item.weightGrams} g` : null, item.cooking, ...(item.options ?? []), item.notes].filter(Boolean);
    return `- ${item.quantity} × ${item.name}${details.length ? ` (${details.join(", ")})` : ""}`;
  }));
  if (input.notes?.trim()) lines.push(`Note per la cucina: ${input.notes.trim()}`);
  if (input.coverCount) lines.push(`Coperti: ${input.coverCount} × ${formatEUR(input.coverUnitCents ?? 0)}`);
  lines.push(`Totale${input.weighted ? " indicativo" : ""}: ${formatEUR(input.totalCents)}`,
    input.payment === "STRIPE_PAID" ? "Pagamento online confermato da Stripe." :
    input.payment === "CASH_PAID" ? "Pagamento registrato dal personale." :
    input.payment === "STRIPE" ? "Pagamento online da completare su Stripe." : "Pagamento alla cassa.");
  return lines.join("\n");
}
