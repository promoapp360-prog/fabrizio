import { randomUUID } from "node:crypto";
import { buildOrderEmail, type OrderEmailData } from "../src/lib/order-email";
import { notify } from "../src/lib/notify";
import { db } from "../src/lib/db";

// Explicit opt-in only. Sends four real messages, never creates orders/payments.
async function main() {
  const recipient = process.argv[2];
  if (process.argv[3] !== "--send" || !recipient || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient))
    throw new Error("Uso: npx tsx scripts/check-order-email.ts destinatario --send");
  const run = randomUUID();
  const order: OrderEmailData = {
    id: `smtp-check-${run}`, number: 0, channel: "TAKEAWAY", tableNumber: null,
    customerName: "Verifica email", customer: { name: "Verifica email" }, pickupAt: null,
    finalCents: null, estimatedCents: 2500, hasWeighted: true, notes: null,
    items: [{ quantity: 1, nameSnapshot: "Verifica tecnica", cooking: null, lineEstCents: 2500, lineFinalCents: null }],
  };
  for (const event of ["RECEIVED", "READY", "FINAL", "PAID"]) {
    if (event === "FINAL") {
      order.finalCents = 2750;
      order.items[0].lineFinalCents = 2750;
    }
    // No tracking link: this is a fixture, not a real order.
    const mail = buildOrderEmail(order, event, "");
    const input = {
      channel: "email" as const, to: recipient,
      subject: `[PROVA TECNICA ${event}] ${mail.subject}`,
      body: `PROVA TECNICA AUTORIZZATA — Nessun ordine o pagamento reale.\n\n${mail.body}`,
      key: `smtp-check:${run}:${event}`,
    };
    const result = await notify(input);
    console.log(`${event}: ${result.status}; notification=${result.id}`);
    if (result.status !== "sent") throw new Error("Prova non accettata dal servizio email");
    const duplicate = await notify(input);
    if (duplicate.id !== result.id || duplicate.status !== "sent")
      throw new Error("Verifica deduplicazione fallita");
    console.log(`${event}: secondo tentativo deduplicato`);
  }
  console.log("Quattro messaggi accettati dal servizio SMTP. La ricezione in casella va confermata dal destinatario.");
}

main().catch(() => {
  console.error("Verifica non completata. Controllare configurazione e comunicazioni; nessun dettaglio riservato viene stampato.");
  process.exitCode = 1;
}).finally(() => db.$disconnect());
