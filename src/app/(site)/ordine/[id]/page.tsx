import OrderReceipt from "./OrderReceipt";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Stato del tuo ordine", robots: { index: false, follow: false } };
export default async function Receipt({ params }: { params: Promise<{ id: string }> }) {
  const [resolved, settings] = await Promise.all([params, getSettings()]);
  return <OrderReceipt id={resolved.id} whatsapp={settings.contacts.whatsapp} />;
}
