import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ sendMail: vi.fn(), transport: vi.fn(), rows: new Map<string, any>(), update: vi.fn() }));
vi.mock("nodemailer", () => ({ default: { createTransport: mocks.transport } }));
vi.mock("../src/lib/db", () => ({
  db: { notification: {
    upsert: async ({ create }: any) => {
      if (!mocks.rows.has(create.id)) mocks.rows.set(create.id, { ...create });
      return { ...mocks.rows.get(create.id) };
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
