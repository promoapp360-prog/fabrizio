import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ sendMail: vi.fn(), transport: vi.fn(), rows: new Map<string, any>(), update: vi.fn() }));
vi.mock("nodemailer", () => ({ default: { createTransport: mocks.transport } }));
vi.mock("../src/lib/db", () => ({
  db: { notification: {
    createMany: async ({ data }: any) => {
      for (const create of data) if (!mocks.rows.has(create.id)) mocks.rows.set(create.id, { ...create });
      return { count: data.length };
    },
    updateMany: async ({ where, data }: any) => {
      const row = mocks.rows.get(where.id);
      if (where.status.notIn.includes(row.status)) return { count: 0 };
      Object.assign(row, data);
      return { count: 1 };
    },
    findUniqueOrThrow: async ({ where }: any) => ({ ...mocks.rows.get(where.id) }),
    update: mocks.update,
  } },
}));

import { notificationId, notify } from "../src/lib/notify";
import { notifyRestaurant, sendCommercialEmails, RESTAURANT_NOTIFICATION_EMAIL } from "../src/lib/commercial-email";

const input = { channel: "email" as const, to: "test@example.invalid", subject: "Ordine", body: "Conferma", key: "order:1:RECEIVED" };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.rows.clear();
  for (const key of ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "MAIL_FROM"])
    vi.stubEnv(key, "test-only");
  vi.stubEnv("SMTP_PORT", "465");
  mocks.transport.mockReturnValue({ sendMail: mocks.sendMail });
  mocks.sendMail.mockResolvedValue({ accepted: [input.to], rejected: [] });
  mocks.update.mockImplementation(async ({ where, data }: any) => {
    Object.assign(mocks.rows.get(where.id), data);
    return { ...mocks.rows.get(where.id) };
  });
});

describe("eventi commerciali al locale e al cliente", () => {
  const customer = { to: "client@example.invalid", key: "reservation:fixture:RECEIVED", subject: "Prenotazione", body: "Ricevuta", customerId: "customer_fixture" };
  const restaurant = { key: customer.key, subject: "Prenotazione", body: "Nuova prenotazione", customerId: "customer_fixture" };
  it("usa due invii distinti, sempre alla casella Vecciarì e mai in copia visibile", async () => {
    await sendCommercialEmails(customer, restaurant);
    expect(mocks.sendMail).toHaveBeenCalledTimes(2);
    expect(mocks.sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: RESTAURANT_NOTIFICATION_EMAIL }));
    expect(mocks.sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: customer.to }));
    expect(mocks.rows.has(notificationId(`restaurant:${customer.key}`))).toBe(true);
    for (const [message] of mocks.sendMail.mock.calls) {
      expect(message.cc).toBeUndefined(); expect(message.bcc).toBeUndefined();
    }
  });
  it("avvisa il locale anche per una prenotazione telefonica senza email cliente", async () => {
    const result = await sendCommercialEmails(null, restaurant);
    expect(result.customer).toBeNull();
    expect(result.restaurant.status).toBe("sent");
    expect(mocks.sendMail).toHaveBeenCalledTimes(1);
    expect(mocks.sendMail.mock.calls[0][0].to).toBe("vecciarimatera@gmail.com");
  });
  it("deduplica separatamente i destinatari anche con retry concorrenti", async () => {
    await Promise.all(Array.from({ length: 4 }, () => sendCommercialEmails(customer, restaurant)));
    expect(mocks.sendMail).toHaveBeenCalledTimes(2);
  });
  it("un rifiuto cliente non impedisce l’invio al locale", async () => {
    mocks.sendMail.mockImplementation(async ({ to }) => {
      if (to === customer.to) throw Object.assign(new Error("fixture SMTP"), { code: "EENVELOPE" });
      return { accepted: [to], rejected: [] };
    });
    const result = await sendCommercialEmails(customer, restaurant);
    expect(result.customer?.status).toBe("failed");
    expect(result.restaurant.status).toBe("sent");
  });
  it("un retry ritenta soltanto la copia al locale fallita, senza reinviare al cliente", async () => {
    mocks.sendMail.mockImplementation(async ({ to }) => {
      if (to === RESTAURANT_NOTIFICATION_EMAIL) throw Object.assign(new Error("fixture SMTP"), { code: "EAUTH" });
      return { accepted: [to], rejected: [] };
    });
    expect((await sendCommercialEmails(customer, restaurant)).restaurant.status).toBe("failed");
    mocks.sendMail.mockResolvedValue({ accepted: [RESTAURANT_NOTIFICATION_EMAIL], rejected: [] });
    expect((await sendCommercialEmails(customer, restaurant)).restaurant.status).toBe("sent");
    expect(mocks.sendMail.mock.calls.filter(([message]) => message.to === customer.to)).toHaveLength(1);
    expect(mocks.sendMail.mock.calls.filter(([message]) => message.to === RESTAURANT_NOTIFICATION_EMAIL)).toHaveLength(2);
  });
  it("un esito SMTP incerto non viene reinviato automaticamente al locale", async () => {
    mocks.sendMail.mockRejectedValue(Object.assign(new Error("fixture timeout"), { code: "ETIMEDOUT", command: "DATA" }));
    expect((await notifyRestaurant(restaurant)).status).toBe("delivery_unknown");
    await notifyRestaurant(restaurant);
    expect(mocks.sendMail).toHaveBeenCalledTimes(1);
  });
  it("non considera inviato un evento se SMTP non è configurato", async () => {
    vi.stubEnv("SMTP_PASSWORD", "");
    const result = await sendCommercialEmails(customer, restaurant);
    expect(result.customer?.status).toBe("skipped_not_configured");
    expect(result.restaurant.status).toBe("skipped_not_configured");
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });
});

describe("esiti reali e deduplicazione email", () => {
  it("non invia quando manca la configurazione", async () => {
    vi.stubEnv("SMTP_PASSWORD", "");
    expect((await notify(input)).status).toBe("skipped_not_configured");
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });
  it("registra sent solo dopo l’accettazione SMTP e non reinvia", async () => {
    expect((await notify(input)).status).toBe("sent");
    expect((await notify(input)).status).toBe("sent");
    expect(mocks.sendMail).toHaveBeenCalledTimes(1);
    expect(mocks.transport).toHaveBeenCalledWith(expect.objectContaining({ secure: true, port: 465 }));
  });
  it("serializza richieste concorrenti per la stessa notifica", async () => {
    await Promise.all([notify(input), notify(input), notify(input)]);
    expect(mocks.sendMail).toHaveBeenCalledTimes(1);
  });
  it("rifiuta una risposta senza destinatari accettati", async () => {
    mocks.sendMail.mockResolvedValue({ accepted: [], rejected: [input.to] });
    expect((await notify(input)).status).toBe("failed");
  });
  it("gestisce l’errore di autenticazione senza conservarne i dettagli", async () => {
    mocks.sendMail.mockRejectedValue(Object.assign(new Error("risposta riservata"), { code: "EAUTH" }));
    const result = await notify(input);
    expect(result.status).toBe("failed");
    expect(result.error).not.toContain("riservata");
    mocks.sendMail.mockResolvedValue({ accepted: [input.to] });
    expect((await notify(input)).status).toBe("sent");
  });
  it("non reinvia dopo una perdita di connessione dall’esito incerto", async () => {
    mocks.sendMail.mockRejectedValue(Object.assign(new Error("timeout"), { code: "ETIMEDOUT", command: "DATA" }));
    expect((await notify(input)).status).toBe("delivery_unknown");
    expect((await notify(input)).status).toBe("delivery_unknown");
    expect(mocks.sendMail).toHaveBeenCalledTimes(1);
  });
  it("consente di riprovare quando la connessione non è stata aperta", async () => {
    mocks.sendMail.mockRejectedValue(Object.assign(new Error("timeout"), { code: "ETIMEDOUT", command: "CONN" }));
    expect((await notify(input)).status).toBe("failed");
  });
  it("mantiene il blocco se il database fallisce dopo l’accettazione", async () => {
    mocks.update.mockRejectedValueOnce(new Error("database unavailable"));
    await expect(notify(input)).rejects.toThrow("database unavailable");
    expect(mocks.rows.get(notificationId(input.key)).status).toBe("sending");
    await notify(input);
    expect(mocks.sendMail).toHaveBeenCalledTimes(1);
  });
  it("usa TLS obbligatorio sulla porta 587", async () => {
    vi.stubEnv("SMTP_PORT", "587");
    await notify(input);
    expect(mocks.transport).toHaveBeenCalledWith(expect.objectContaining({ secure: false, requireTLS: true, port: 587 }));
  });
});
