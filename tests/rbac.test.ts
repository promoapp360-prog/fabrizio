import { describe, it, expect } from "vitest";
import { can } from "../src/lib/rbac";
describe("[Test 11] permessi", () => {
  it("cucina non accede a clienti, impostazioni, menu", () => { for (const p of ["customers", "settings", "menu", "users", "stats"] as const) expect(can("KITCHEN", p)).toBe(false); });
  it("cameriere non gestisce utenti né contenuti", () => { expect(can("WAITER", "users")).toBe(false); expect(can("WAITER", "content")).toBe(false); expect(can("WAITER", "orders.manage")).toBe(true); });
  it("responsabile non gestisce utenti", () => expect(can("MANAGER", "users")).toBe(false));
  it("super admin ha tutto", () => expect(can("SUPER_ADMIN", "audit")).toBe(true));
});
