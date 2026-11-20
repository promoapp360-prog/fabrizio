export const LANGUAGE_COOKIE = "vecciari_language";
export const languages = [
  { code: "it", name: "Italiano", flag: "🇮🇹", locale: "it-IT" },
  { code: "es", name: "Español", flag: "🇪🇸", locale: "es-ES" },
  { code: "pt", name: "Português", flag: "🇧🇷", locale: "pt-BR" },
  { code: "ru", name: "Русский", flag: "🇷🇺", locale: "ru-RU" },
  { code: "uk", name: "Українська", flag: "🇺🇦", locale: "uk-UA" },
  { code: "ko", name: "한국어", flag: "🇰🇷", locale: "ko-KR" },
  { code: "zh", name: "中文", flag: "🇨🇳", locale: "zh-CN" },
  { code: "el", name: "Ελληνικά", flag: "🇬🇷", locale: "el-GR" },
  { code: "nl", name: "Nederlands", flag: "🇳🇱", locale: "nl-NL" },
  { code: "hr", name: "Hrvatski", flag: "🇭🇷", locale: "hr-HR" },
  { code: "sr", name: "Srpski", flag: "🇷🇸", locale: "sr-Latn-RS" },
  { code: "sl", name: "Slovenščina", flag: "🇸🇮", locale: "sl-SI" },
  { code: "mk", name: "Македонски", flag: "🇲🇰", locale: "mk-MK" },
  { code: "bs", name: "Bosanski", flag: "🇧🇦", locale: "bs-BA" },
  { code: "ro", name: "Română", flag: "🇷🇴", locale: "ro-RO" },
  { code: "pl", name: "Polski", flag: "🇵🇱", locale: "pl-PL" },
  { code: "cs", name: "Čeština", flag: "🇨🇿", locale: "cs-CZ" },
  { code: "sq", name: "Shqip", flag: "🇦🇱", locale: "sq-AL" },
  { code: "he", name: "עברית", flag: "🇮🇱", locale: "he-IL" },
  { code: "bg", name: "Български", flag: "🇧🇬", locale: "bg-BG" },
] as const;
export type Language = typeof languages[number]["code"];
export type Dictionary = Record<string, string>;
export const isLanguage = (value: unknown): value is Language =>
  typeof value === "string" && languages.some(language => language.code === value);
export const normalizeMessage = (value: string) => value.replace(/\s+/g, " ").trim();
export const languageDirection = (language: Language) => language === "he" ? "rtl" : "ltr";
