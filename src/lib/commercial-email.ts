import { notify } from "./notify";

// Casella del cliente Vecciarì, richiesta espressamente per gli eventi commerciali.
export const RESTAURANT_NOTIFICATION_EMAIL = "vecciarimatera@gmail.com";
type Message = { key: string; subject: string; body: string; customerId?: string };

export function notifyRestaurant(message: Message) {
  return notify({
    ...message, channel: "email", to: RESTAURANT_NOTIFICATION_EMAIL,
    subject: `Avviso al locale · ${message.subject}`, key: `restaurant:${message.key}`,
  });
}

/** I due invii sono indipendenti: un errore cliente non deve saltare il locale. */
export async function sendCommercialEmails(customer: (Message & { to: string }) | null, restaurant: Message) {
  const [client, staff] = await Promise.allSettled([
    customer ? notify({ ...customer, channel: "email" }) : Promise.resolve(null),
    notifyRestaurant(restaurant),
  ]);
  // Attendere entrambi anche in caso di errore del registro notifiche.
  // Gli errori SMTP sono registrati da notify e non simulati come invii riusciti.
  if (staff.status === "rejected") throw staff.reason;
  if (client.status === "rejected") throw client.reason;
  return { customer: client.value, restaurant: staff.value };
}
