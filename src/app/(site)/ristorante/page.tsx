import Translated from "@/components/public/ServerTranslated";
import { PageSections } from "@/components/public/Sections";
import { getSettings } from "@/lib/settings";
import { getUser } from "@/lib/auth";
export const metadata = { title: "Il ristorante" };
export default async function Ristorante({ searchParams: pendingSearchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const searchParams = await pendingSearchParams;
  const s = await getSettings();
  return <Translated>{<PageSections slug="ristorante" s={s} preview={searchParams.preview === "1" && !!(await getUser())} />}</Translated>;
}
