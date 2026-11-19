import OrderReceipt from "./OrderReceipt";

export const metadata = { title: "Stato del tuo ordine", robots: { index: false, follow: false } };
export default async function Receipt({ params }: { params: Promise<{ id: string }> }) {
  return <OrderReceipt id={(await params).id} />;
}
