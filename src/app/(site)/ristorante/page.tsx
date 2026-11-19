import { PageSections } from "@/components/public/Sections";
import { getSettings } from "@/lib/settings";
import { getUser } from "@/lib/auth";
export const metadata = { title: "Il ristorante" };
export default async function Ristorante({ searchParams }: { searchParams: { preview?: string } }) {
  const s = await getSettings();
  return <PageSections slug="ristorante" s={s} preview={searchParams.preview === "1" && !!(await getUser())} />;
}
