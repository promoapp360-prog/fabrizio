import { z } from "zod";

export const customerOrderSchema = z.object({
  name: z.string().trim().min(2, "Inserisci il nome").max(80),
  phone: z.string().trim().min(6, "Inserisci il telefono").max(25),
  email: z.string().trim().email("Inserisci un’email valida").max(160).transform(s => s.toLowerCase()),
  privacy: z.literal(true),
});

export function requestedPaymentAvailable(payment: string, onlineEnabled: boolean) {
  return payment !== "STRIPE" || onlineEnabled;
}
