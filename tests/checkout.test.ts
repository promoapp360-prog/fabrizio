import { describe, expect, it } from "vitest";
import { customerOrderSchema, requireCounterPayment } from "../src/lib/checkout";

describe("dati cliente per ordini tavolo e asporto", () => {
  const valid = { name: "Cliente Ordini", email: "CLIENTE@EXAMPLE.INVALID ", phone: "0000000000", privacy: true };
  it("normalizza email e conserva i dati cliente", () => {
    expect(customerOrderSchema.parse(valid).email).toBe("cliente@example.invalid");
  });
  it.each(["", "non-valida", "a@"])("rifiuta l’email non valida %s", email => {
    expect(customerOrderSchema.safeParse({ ...valid, email }).success).toBe(false);
  });
  it("richiede privacy, nome e telefono", () => {
    expect(customerOrderSchema.safeParse({ ...valid, privacy: false }).success).toBe(false);
    expect(customerOrderSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
    expect(customerOrderSchema.safeParse({ ...valid, phone: "" }).success).toBe(false);
  });
  it("non abilita Stripe prima del collegamento del cliente", () => {
    expect(requireCounterPayment("STRIPE")).toBe(false);
    expect(requireCounterPayment("AT_COUNTER")).toBe(true);
    expect(requireCounterPayment("ON_PICKUP")).toBe(true);
  });
});
