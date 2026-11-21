export type StoredDiningParty = { key: string; people: number; confirmed: boolean; at: number };
const storageKey = (tableNumber: number) => `vecciari-party:${tableNumber}`;

export function readDiningParty(tableNumber: number): StoredDiningParty | null {
  try {
    const saved = JSON.parse(window.localStorage.getItem(storageKey(tableNumber)) || "null");
    if (saved && /^[0-9a-f-]{36}$/i.test(saved.key) && Number.isInteger(saved.people) &&
      saved.people >= 1 && saved.people <= 50 && typeof saved.confirmed === "boolean" &&
      Number.isFinite(saved.at) && Date.now() - saved.at < 8 * 3600000 && Date.now() >= saved.at) return saved;
  } catch { /* Storage may be disabled; the open page still retains its group. */ }
  return null;
}

export function saveDiningParty(tableNumber: number, group: StoredDiningParty): void {
  try {
    const previous = readDiningParty(tableNumber);
    window.localStorage.setItem(storageKey(tableNumber), JSON.stringify({
      ...group, at: previous?.key === group.key ? previous.at : group.at,
    }));
  } catch { /* Never replace a known group because persistence is unavailable. */ }
}
