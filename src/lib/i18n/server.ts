import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { isLanguage, LANGUAGE_COOKIE, type Dictionary, type Language } from "./languages";

export const getLanguage = cache(async (): Promise<Language> => {
  const pathname = (await headers()).get("x-vecciari-pathname") || "/";
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "it";
  const value = (await cookies()).get(LANGUAGE_COOKIE)?.value;
  return isLanguage(value) ? value : "it";
});

export const getDictionary = cache(async (language: Language): Promise<Dictionary> => {
  if (language === "it") return {};
  const data = await import(`./dictionaries/${language}.json`);
  return data.default;
});
