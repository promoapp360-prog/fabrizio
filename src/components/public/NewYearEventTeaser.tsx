"use client";
import Link from "next/link";
import { useLanguage } from "./LanguageProvider";
import { NEW_YEAR_EVENT } from "@/lib/new-year-event";

export default function NewYearEventTeaser() {
  const { t } = useLanguage();
  return (
    <Link href={NEW_YEAR_EVENT.path} className="new-year-teaser group">
      <time dateTime={NEW_YEAR_EVENT.date} className="new-year-teaser-date">{t("31 dicembre 2026")}</time>
      <span className="new-year-teaser-title">{t("Cena con delitto da Vecciarì")}</span>
      <span className="new-year-teaser-link">{t("Scopri la serata")} <span aria-hidden="true">→</span></span>
    </Link>
  );
}
