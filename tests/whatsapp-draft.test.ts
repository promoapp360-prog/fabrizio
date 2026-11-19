import { describe, expect, it } from "vitest";
import { orderWhatsAppMessage, reservationWhatsAppMessage, whatsappDraftUrl } from "../src/lib/whatsapp-draft";

describe("WhatsApp draft links", () => {
  it("cleans the restaurant number and URL-encodes Italian message text", () => {
    const url = whatsappDraftUrl("+39 393 138 0073", "Buongiorno, ordine #12");
    expect(url).toMatch(/^https:\/\/wa\.me\/393931380073\?text=/);
    expect(decodeURIComponent(url!.split("?text=")[1])).toBe("Buongiorno, ordine #12");
  });

  it("rejects an invalid recipient or an empty draft", () => {
    expect(whatsappDraftUrl("123", "Ordine")).toBeNull();
    expect(whatsappDraftUrl("+39 393 138 0073", "  ")).toBeNull();
  });

  it("includes table, line notes, quantity and cash payment in an order", () => {
    const message = orderWhatsAppMessage({
      number: 42, channel: "TABLE", tableNumber: 7,
      items: [{ name: "Costata", quantity: 2, cooking: "Media", options: ["Patate"], notes: "senza sale" }],
      totalCents: 4200, notes: "Allergia dichiarata",
    });
    expect(message).toContain("Ordine n° 42");
    expect(message).toContain("Tavolo: 7");
    expect(message).toContain("- 2 × Costata (Media, Patate, senza sale)");
    expect(message).toContain("Note per la cucina: Allergia dichiarata");
    expect(message).toContain("Pagamento alla cassa.");
    expect(message).not.toMatch(/email|telefono/i);
  });

  it("includes takeaway pickup details and delivery address when provided", () => {
    const pickup = orderWhatsAppMessage({
      number: 8, channel: "TAKEAWAY", pickupName: "Anna",
      pickupAt: "2030-01-15T18:30:00.000Z", items: [], totalCents: 0,
    });
    expect(pickup).toContain("Modalità: Asporto");
    expect(pickup).toContain("Nome: Anna");
    expect(pickup).toContain("Ritiro:");

    const delivery = orderWhatsAppMessage({
      number: 9, channel: "DELIVERY", address: "Via Roma 1",
      items: [], totalCents: 0, weighted: true,
    });
    expect(delivery).toContain("Indirizzo: Via Roma 1");
    expect(delivery).toContain("Totale indicativo:");
  });

  it("drafts a reservation confirmation request without customer contact data", () => {
    const message = reservationWhatsAppMessage({ code: "VC-123", date: "2030-01-15", time: "20:00", people: 4 });
    expect(message).toContain("VC-123");
    expect(message).toContain("ore 20:00, 4 persone");
    expect(message).toContain("richiesta di prenotazione");
  });
});
