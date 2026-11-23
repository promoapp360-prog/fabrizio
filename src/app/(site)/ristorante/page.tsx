import Translated from "@/components/public/ServerTranslated";
import { PageSections } from "@/components/public/Sections";
import { getSettings } from "@/lib/settings";
import { getUser } from "@/lib/auth";
import { createPageMetadata } from "@/lib/page-metadata";
export const generateMetadata = () => createPageMetadata({
  title: "Ristorante con carne alla brace a Matera",
  description: "Scopri Vecciarì – Grano & Brace a Matera, in Via XX Settembre 14: carni selezionate e cucina alla brace, in un ambiente dedicato alla tradizione materana.",
  path: "/ristorante",
});
export default async function Ristorante({ searchParams: pendingSearchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const searchParams = await pendingSearchParams;
  const s = await getSettings();
  return <Translated>{<PageSections slug="ristorante" s={s} preview={searchParams.preview === "1" && !!(await getUser())} />}</Translated>;
}
