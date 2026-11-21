"use client";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useLanguage } from "./LanguageProvider";

const asDate = (day: string) => new Date(`${day}T12:00:00Z`);
const asDay = (date: Date) => date.toISOString().slice(0, 10);
const shiftDay = (day: string, count: number) => {
  const date = asDate(day);
  date.setUTCDate(date.getUTCDate() + count);
  return asDay(date);
};
const shiftMonth = (month: string, count: number) => {
  const date = asDate(`${month}-01`);
  date.setUTCMonth(date.getUTCMonth() + count);
  return asDay(date).slice(0, 7);
};

/** Calendario sempre visibile: stessa dimensione anche su Safari e telefoni. */
export default function DateCalendar({ value, min, onChange }: {
  value: string; min: string; onChange: (day: string) => void;
}) {
  const { locale, t } = useLanguage();
  const [month, setMonth] = useState((value || min).slice(0, 7));
  const [focused, setFocused] = useState(value || min);
  const root = useRef<HTMLDivElement>(null);
  const focusPending = useRef(false);
  const titleId = useId();
  const monthLabel = (m: string) => new Intl.DateTimeFormat(locale, { timeZone: "UTC", month: "long", year: "numeric" }).format(asDate(`${m}-01`));
  const fullDate = (day: string) => new Intl.DateTimeFormat(locale, {
    timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(asDate(day));
  const first = `${month}-01`;
  const offset = (asDate(first).getUTCDay() + 6) % 7;
  const daysInMonth = asDate(shiftDay(`${shiftMonth(month, 1)}-01`, -1)).getUTCDate();
  const cells = Math.ceil((offset + daysInMonth) / 7) * 7;
  const dates = Array.from({ length: cells }, (_, index) => {
    const number = index - offset + 1;
    return number > 0 && number <= daysInMonth ? `${month}-${String(number).padStart(2, "0")}` : null;
  });
  const firstEnabled = dates.find(day => day && day >= min);
  const tabDay = focused.startsWith(month) && focused >= min ? focused : firstEnabled;
  useEffect(() => {
    if (!focusPending.current) return;
    root.current?.querySelector<HTMLButtonElement>(`button[data-day="${focused}"]`)?.focus();
    focusPending.current = false;
  }, [focused, month]);
  function browseMonth(count: number) {
    const next = shiftMonth(month, count);
    if (next < min.slice(0, 7)) return;
    setMonth(next);
    setFocused(next === min.slice(0, 7) ? min : `${next}-01`);
  }
  function moveFocus(event: KeyboardEvent, day: string) {
    let next: string;
    const weekday = (asDate(day).getUTCDay() + 6) % 7;
    switch (event.key) {
      case "ArrowLeft": next = shiftDay(day, -1); break;
      case "ArrowRight": next = shiftDay(day, 1); break;
      case "ArrowUp": next = shiftDay(day, -7); break;
      case "ArrowDown": next = shiftDay(day, 7); break;
      case "Home": next = shiftDay(day, -weekday); break;
      case "End": next = shiftDay(day, 6 - weekday); break;
      case "PageUp": next = `${shiftMonth(month, -1)}-01`; break;
      case "PageDown": next = `${shiftMonth(month, 1)}-01`; break;
      default: return;
    }
    event.preventDefault();
    if (next < min) next = min;
    focusPending.current = true;
    setFocused(next); setMonth(next.slice(0, 7));
    // Focus the boundary even when it was already the active day.
    if (next === focused) {
      root.current?.querySelector<HTMLButtonElement>(`button[data-day="${next}"]`)?.focus();
      focusPending.current = false;
    }
  }
  return <div ref={root} className="min-w-0 rounded-2xl border border-gold/25 bg-ink p-3 sm:p-4">
    <div className="mb-4 flex items-center justify-between gap-2">
      <button type="button" disabled={month <= min.slice(0, 7)} aria-label={`${t("Indietro")}: ${monthLabel(shiftMonth(month, -1))}`}
        onClick={() => browseMonth(-1)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cream/15 text-2xl text-gold hover:bg-gold/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold disabled:opacity-25">‹</button>
      <p id={titleId} aria-live="polite" className="text-center text-base font-semibold capitalize text-cream sm:text-lg" translate="no">{monthLabel(month)}</p>
      <button type="button" aria-label={`${t("Continua")}: ${monthLabel(shiftMonth(month, 1))}`}
        onClick={() => browseMonth(1)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cream/15 text-2xl text-gold hover:bg-gold/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">›</button>
    </div>
    <table aria-labelledby={titleId} className="w-full table-fixed border-separate border-spacing-1 text-center" dir="ltr">
      <thead><tr>{Array.from({ length: 7 }, (_, index) => {
        const day = asDate(shiftDay("2026-01-05", index));
        return <th key={index} scope="col" className="pb-2 text-[11px] font-normal uppercase text-cream/65" title={new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(day)}>
          <span translate="no">{new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(day)}</span>
        </th>;
      })}</tr></thead>
      <tbody>{Array.from({ length: cells / 7 }, (_, row) => <tr key={row}>{dates.slice(row * 7, row * 7 + 7).map((day, column) =>
        <td key={column} className="p-0">{day && <button type="button" data-day={day} disabled={day < min}
          aria-label={fullDate(day)} aria-pressed={day === value} aria-current={day === min ? "date" : undefined}
          tabIndex={day === tabDay ? 0 : -1} onFocus={() => setFocused(day)} onKeyDown={event => moveFocus(event, day)}
          onClick={() => { setFocused(day); onChange(day); }}
          className={`min-h-11 w-full rounded-lg border text-sm font-semibold tabular-nums transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:text-base ${
            day === value ? "border-gold bg-gold text-ink shadow-sm" : day < min ? "cursor-not-allowed border-transparent text-cream/20" :
              day === min ? "border-gold/60 text-gold hover:bg-gold/15" : "border-transparent text-cream hover:border-gold/30 hover:bg-gold/15"
          }`}><span translate="no">{Number(day.slice(-2))}</span></button>}</td>
      )}</tr>)}</tbody>
    </table>
    <p className="mt-3 border-t border-cream/10 pt-3 text-center text-sm capitalize text-gold" aria-live="polite" translate="no">{value ? fullDate(value) : ""}</p>
  </div>;
}
