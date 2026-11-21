import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readDiningParty, saveDiningParty } from "../src/lib/dining-party-storage";

const group = { key: "12345678-1234-4234-8234-123456789abc", people: 3, confirmed: true, at: Date.now() };
beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("window", { localStorage: { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value) } });
});
afterEach(() => vi.unstubAllGlobals());

describe("conservazione del gruppo coperti", () => {
  it("mantiene la visita originale e non ne prolunga la durata al ritorno", () => {
    saveDiningParty(7, group);
    saveDiningParty(7, { ...group, people: 4, at: group.at + 60_000 });
    expect(readDiningParty(7)).toEqual({ ...group, people: 4 });
    expect(readDiningParty(8)).toBeNull();
  });
  it.each([Date.now() - 9 * 3600000, Date.now() + 3600000, NaN])("scarta visite scadute o non valide", at => {
    saveDiningParty(7, { ...group, at });
    expect(readDiningParty(7)).toBeNull();
  });
  it("non interrompe la pagina se il browser blocca lo storage", () => {
    vi.stubGlobal("window", { get localStorage() { throw Error("blocked"); } });
    expect(readDiningParty(7)).toBeNull();
    expect(() => saveDiningParty(7, group)).not.toThrow();
  });
});
