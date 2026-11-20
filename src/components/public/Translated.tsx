"use client";
import type { ReactNode } from "react";
import { useLanguage } from "./LanguageProvider";
import { translateTree } from "@/lib/i18n/translate-tree";

/** Translates React nodes, not the DOM: state, events and controlled fields stay intact. */
export default function Translated({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  return <>{translateTree(children, t)}</>;
}
