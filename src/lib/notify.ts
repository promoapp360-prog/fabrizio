import { db } from "./db";
import nodemailer from "nodemailer";
import { createHash } from "node:crypto";
/**
 * Invio notifiche. Se il canale non è configurato la notifica viene registrata come
 * "skipped_not_configured" — nessun invio simulato.
 */
export async function notify(n: { channel: "email" | "whatsapp" | "internal"; to: string; subject?: string; body: string; customerId?: string; key?: string }) {
  const { key, ...data } = n;
  // INSERT ... ON CONFLICT DO NOTHING: due webhook concorrenti non devono
  // gareggiare su un upsert emulato prima di acquisire il blocco d'invio.
  if (key) await db.notification.createMany({
    data: [{ id: notificationId(key), ...data, status: "queued" }], skipDuplicates: true,
  });
  const rec = key
    ? await db.notification.findUniqueOrThrow({ where: { id: notificationId(key) } })
    : await db.notification.create({ data: { ...data, status: "queued" } });
  if (["sent", "sending", "delivery_unknown"].includes(rec.status)) return rec;
  let acceptedByProvider = false;
  try {
    if (n.channel === "internal") return db.notification.update({ where: { id: rec.id }, data: { status: "sent" } });
    if (n.channel === "email") {
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD || !process.env.MAIL_FROM)
        return db.notification.update({ where: { id: rec.id }, data: { status: "skipped_not_configured", error: "Servizio email non ancora collegato" } });
      const claimed = await db.notification.updateMany({ where: { id: rec.id, status: { notIn: ["sent", "sending", "delivery_unknown"] } }, data: { status: "sending", error: null } });
      if (!claimed.count) return db.notification.findUniqueOrThrow({ where: { id: rec.id } });
      const port = Number(process.env.SMTP_PORT || 587);
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST, port, secure: port === 465, requireTLS: port !== 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
        connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
      });
      const result = await transport.sendMail({ from: process.env.MAIL_FROM, to: n.to, subject: n.subject, text: n.body });
      if (!result.accepted?.length || result.rejected?.length)
        throw new Error("Recipient not accepted");
      acceptedByProvider = true;
      return await db.notification.update({ where: { id: rec.id }, data: { status: "sent", error: null } });
    }
    if (!process.env.WHATSAPP_CLOUD_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID)
      return db.notification.update({ where: { id: rec.id }, data: { status: "skipped_not_configured" } });
    const r = await fetch(`https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST", headers: { Authorization: `Bearer ${process.env.WHATSAPP_CLOUD_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: n.to, type: "text", text: { body: n.body } }),
    });
    return db.notification.update({ where: { id: rec.id }, data: { status: r.ok ? "sent" : "failed", error: r.ok ? null : await r.text() } });
  } catch (e) {
    // Never turn an accepted send into a retryable failure if persistence fails.
    if (acceptedByProvider) throw e;
    const smtpError = e as { code?: string; command?: string };
    const uncertain = n.channel === "email" && ["ETIMEDOUT", "ECONNECTION", "ESOCKET"].includes(smtpError.code ?? "") && smtpError.command !== "CONN";
    // Do not retain SMTP responses that could contain credentials or customer data.
    return db.notification.update({ where: { id: rec.id }, data: {
      status: uncertain ? "delivery_unknown" : "failed",
      error: uncertain ? "Esito SMTP incerto. Verificare con il provider prima di reinviare." : "Invio non riuscito. Verificare il servizio di invio.",
    } });
  }
}

export function notificationId(key: string) {
  return `mail_${createHash("sha256").update(key).digest("hex").slice(0, 40)}`;
}
