"use client";
import { useCallback, useEffect, useState } from "react";
import { coverCharge } from "@/lib/portions";

type Quote = { validTable: boolean; coveredCount: number; coverCents: number };
export function useDiningParty(tableNumber: number, enabled: boolean) {
  const [key, setKey] = useState(""), [people, setPeople] = useState(1), [confirmed, setConfirmed] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null), [error, setError] = useState("");
  const [epoch, setEpoch] = useState(0);
  const [loadedTable, setLoadedTable] = useState<number | null>(null);
  useEffect(() => {
    setQuote(null); setError(""); setConfirmed(false); setPeople(1); setKey("");
    if (!enabled || !Number.isInteger(tableNumber) || tableNumber < 1 || tableNumber > 999) return;
    let group = { key: crypto.randomUUID(), people: 1, confirmed: false, at: Date.now() };
    try {
      const saved = JSON.parse(localStorage.getItem(`vecciari-party:${tableNumber}`) || "null");
      if (saved && /^[0-9a-f-]{36}$/i.test(saved.key) && Number.isInteger(saved.people) && saved.people >= 1 &&
        saved.people <= 50 && Date.now() - saved.at < 8 * 3600000 && Date.now() >= saved.at) group = saved;
    } catch { /* Storage may be disabled; this open page still retains its group. */ }
    setKey(group.key); setPeople(group.people); setConfirmed(group.confirmed);
    setLoadedTable(tableNumber);
  }, [tableNumber, enabled]);
  useEffect(() => {
    if (!key || !enabled || loadedTable !== tableNumber) return;
    let active = true;
    const refresh = async () => {
      try {
        const r = await fetch("/api/table/party", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tableNumber, diningGroupKey: key }), cache: "no-store" });
        if (!r.ok) throw new Error("Aggiornamento non disponibile. Riproveremo automaticamente.");
        const next = await r.json();
        if (active) { setQuote(next); setError(next.validTable ? "" : "Inserisci il numero del tavolo."); }
      } catch { if (active) { setQuote(null); setError("Aggiornamento non disponibile. Riproveremo automaticamente."); } }
    };
    refresh(); const timer = setInterval(refresh, 20000);
    return () => { active = false; clearInterval(timer); };
  }, [key, tableNumber, enabled, epoch, loadedTable]);
  useEffect(() => {
    if (!key || !enabled || loadedTable !== tableNumber) return;
    try {
      const previous = JSON.parse(localStorage.getItem(`vecciari-party:${tableNumber}`) || "null");
      localStorage.setItem(`vecciari-party:${tableNumber}`, JSON.stringify({ key, people, confirmed,
        at: previous?.key === key ? previous.at : Date.now() }));
    } catch { /* No personal data is stored; the current page remains usable. */ }
  }, [key, people, confirmed, tableNumber, enabled, loadedTable]);
  const refresh = useCallback(() => setEpoch(e => e + 1), []);
  const fee = coverCharge(enabled ? "TABLE" : "TAKEAWAY", people, quote?.coveredCount ?? 0, quote?.coverCents ?? 0);
  return { key, people, setPeople, confirmed, setConfirmed, coveredCount: quote?.coveredCount ?? 0,
    coverCount: fee.count, coverCents: fee.cents, coverUnitCents: quote?.coverCents ?? 0,
    ready: loadedTable === tableNumber && !!key && !!quote?.validTable && !error, error, refresh };
}
export type DiningParty = ReturnType<typeof useDiningParty>;
