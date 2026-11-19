import { db } from "./db";
/**
 * Invio notifiche. Se il canale non è configurato la notifica viene registrata come
 * "skipped_not_configured" — nessun invio simulato.
 */
export async function notify(n: { channel: "email" | "whatsapp" | "internal"; to: string; subject?: string; body: string; customerId?: string }) {
  const rec = await db.notification.create({ data: { ...n, status: "queued" } });
  try {
    if (n.channel === "internal") return db.notification.update({ where: { id: rec.id }, data: { status: "sent" } });
    if (n.channel === "email") {
      if (!process.env.SMTP_HOST) return db.notification.update({ where: { id: rec.id }, data: { status: "skipped_not_configured" } });
      // Implementazione SMTP: aggiungere `nodemailer` (npm i nodemailer) e inviare qui.
      return db.notification.update({ where: { id: rec.id }, data: { status: "skipped_not_configured", error: "Adapter SMTP da attivare (nodemailer)" } });
    }
    if (!process.env.WHATSAPP_CLOUD_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID)
      return db.notification.update({ where: { id: rec.id }, data: { status: "skipped_not_configured" } });
    const r = await fetch(`https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST", headers: { Authorization: `Bearer ${process.env.WHATSAPP_CLOUD_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: n.to, type: "text", text: { body: n.body } }),
    });
    return db.notification.update({ where: { id: rec.id }, data: { status: r.ok ? "sent" : "failed", error: r.ok ? null : await r.text() } });
  } catch (e) {
    return db.notification.update({ where: { id: rec.id }, data: { status: "failed", error: String(e) } });
  }
}
