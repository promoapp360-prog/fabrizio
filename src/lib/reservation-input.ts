import { z } from "zod";

export const reservationDaySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Data non valida");

export const reservationInputSchema = z.object({
  date: reservationDaySchema,
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  people: z.number().int().min(1).max(40),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160).transform(value => value.toLowerCase()),
  phone: z.string().trim().min(6).max(25),
  notes: z.string().trim().max(500).optional(),
  privacy: z.literal(true),
  marketing: z.boolean().default(false),
  idempotencyKey: z.string().min(8).max(64),
});

export function todayInRome(now = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export type ReservationAvailability = {
  date: string;
  people: number;
  open: boolean;
  closed: string | null;
  requiresContact?: boolean;
  slots: string[];
  services: { id: string; name: string; slots: string[] }[];
};
