/** Orari del locale, indipendenti dal fuso orario di telefono e server. */
const zone = "Europe/Rome";
const pad = (n: number) => String(n).padStart(2, "0");
export function romeDay(now = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function pickupDay(offset: number, now = new Date()) {
  const day = new Date(`${romeDay(now)}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() + offset);
  return day.toISOString().slice(0, 10);
}
function romeDateTime(date: Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(date).replace(" ", "T");
}
function toInstant(day: string, time: string) {
  const wall = Date.parse(`${day}T${time}:00Z`);
  let candidate = wall;
  for (let n = 0; n < 2; n++) {
    candidate += wall - Date.parse(`${romeDateTime(new Date(candidate))}:00Z`);
  }
  return new Date(candidate);
}
export function pickupTimes(day: string, prepMinutes: number, now = new Date()) {
  const date = new Date(`${day}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== day || day < romeDay(now) || day > pickupDay(7, now) || date.getUTCDay() === 1)
    return [];
  const earliest = now.getTime() + Math.max(0, prepMinutes) * 60000;
  const latest = now.getTime() + 7 * 86400000;
  const slots: { time: string; at: string }[] = [];
  for (const [start, end] of [[12 * 60, 15 * 60], [19 * 60, 23 * 60]]) {
    for (let minutes = start; minutes <= end; minutes += 15) {
      const time = `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
      const at = toInstant(day, time);
      if (at.getTime() >= earliest && at.getTime() <= latest) slots.push({ time, at: at.toISOString() });
    }
  }
  return slots;
}
export function validPickupTime(at: Date, prepMinutes: number, now = new Date()) {
  if (!Number.isFinite(at.getTime())) return false;
  return pickupTimes(romeDay(at), prepMinutes, now).some(slot => slot.at === at.toISOString());
}
