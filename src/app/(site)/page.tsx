import Translated from "@/components/public/ServerTranslated";
import { PageSections } from "@/components/public/Sections";
import { getSettings } from "@/lib/settings";
import { getUser } from "@/lib/auth";
import type { Metadata } from "next";

export const metadata: Metadata = { alternates: { canonical: "/" } };

// ?preview=1 mostra le bozze (solo a utenti admin loggati).
export default async function Home({ searchParams: pendingSearchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const searchParams = await pendingSearchParams;
  const s = await getSettings();
  const preview = searchParams.preview === "1" && !!(await getUser());
  return <Translated>{<>{preview && <div className="bg-gold py-1 text-center text-xs font-bold uppercase text-ink">Anteprima bozze</div>}<PageSections slug="home" s={s} preview={preview} /></>}</Translated>;
}
