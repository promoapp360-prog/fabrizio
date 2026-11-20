import type { ReactNode } from "react";
import { getDictionary, getLanguage } from "@/lib/i18n/server";
import { makeTranslator } from "@/lib/i18n/translate";
import { translateTree } from "@/lib/i18n/translate-tree";
import Translated from "./Translated";

/** Translate server-owned text before it becomes a streamed Flight payload. */
export default async function ServerTranslated({ children }: { children: ReactNode }) {
  const language = await getLanguage();
  const t = makeTranslator(await getDictionary(language));
  return <Translated>{translateTree(children, t)}</Translated>;
}
