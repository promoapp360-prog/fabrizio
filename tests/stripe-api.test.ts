import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { verifiedStripeEvent, stripeRequest } from "../src/lib/stripe-api";
const now = 1800000000000;
const secret = "whsec_fixture_not_a_real_secret";
const payload = JSON.stringify({ id: "evt_fixture", type: "checkout.session.completed", livemode: false, data: { object: {} } });
const sign = (body: string, time = now / 1000, key = secret) =>
  `t=${time},v1=${createHmac("sha256", key).update(`${time}.${body}`).digest("hex")}`;
beforeEach(() => {
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fixture_no_real_credentials");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", secret);
  vi.stubEnv("STRIPE_EXPECTED_ACCOUNT_ID", "acct_fixture_authorized");
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("sicurezza Stripe senza richieste reali", () => {
  it("accetta esclusivamente un evento firmato recente", () => {
    expect(verifiedStripeEvent(payload, sign(payload), now).id).toBe("evt_fixture");
    expect(() => verifiedStripeEvent(payload, null, now)).toThrow();
    expect(() => verifiedStripeEvent(payload + " ", sign(payload), now)).toThrow();
    expect(() => verifiedStripeEvent(payload, sign(payload, now / 1000 - 301), now)).toThrow();
    expect(() => verifiedStripeEvent(payload, sign(payload, now / 1000 + 301), now)).toThrow();
    expect(() => verifiedStripeEvent(payload, sign(payload, now / 1000, "wrong-fixture"), now)).toThrow();
  });
  it("rifiuta ambiente live e conto diverso anche con firma valida", () => {
    const live = JSON.stringify({ ...JSON.parse(payload), livemode: true });
    const other = JSON.stringify({ ...JSON.parse(payload), account: "acct_other_fixture" });
    expect(() => verifiedStripeEvent(live, sign(live), now)).toThrow();
    expect(() => verifiedStripeEvent(other, sign(other), now)).toThrow();
  });
  it("accetta rotazione delle firme v1 ma rifiuta timestamp duplicati", () => {
    const valid = sign(payload);
    expect(verifiedStripeEvent(payload, valid + ",v1=" + "0".repeat(64), now).id).toBe("evt_fixture");
    expect(() => verifiedStripeEvent(payload, valid + ",t=1800000000", now)).toThrow();
  });
  it("non effettua scritture se il conto verificato non coincide", async () => {
    vi.stubEnv("STRIPE_EXPECTED_ACCOUNT_ID", "acct_expected_different_fixture");
    const network = vi.fn().mockResolvedValue(Response.json({ id: "acct_wrong_fixture", charges_enabled: true, default_currency: "eur" }));
    vi.stubGlobal("fetch", network);
    await expect(stripeRequest("/products", { name: "Must not create" })).rejects.toThrow("conto Stripe");
    expect(network).toHaveBeenCalledTimes(1);
    expect(network.mock.calls[0][1].method).toBe("GET");
  });
  it("non espone gli errori del provider", async () => {
    vi.stubEnv("STRIPE_EXPECTED_ACCOUNT_ID", "acct_http_error_fixture");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: { message: "provider-sensitive-fixture" } }, { status: 401 })));
    await expect(stripeRequest("/account")).rejects.not.toThrow("provider-sensitive-fixture");
  });
});
