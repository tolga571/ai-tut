/**
 * Centralized language configuration.
 * These 7 languages are the ONLY supported learning languages across the entire app.
 * Used in: onboarding, profile, chat tutor, validation, admin panel, i18n selector.
 */
export const SUPPORTED_LANGUAGES = [
  { code: "ar", nameEn: "Arabic",           flag: "🇸🇦" },
  { code: "en", nameEn: "English",          flag: "🇬🇧" },
  { code: "es", nameEn: "Spanish",          flag: "🇪🇸" },
  { code: "zh", nameEn: "Mandarin Chinese", flag: "🇨🇳" },
  { code: "de", nameEn: "German",           flag: "🇩🇪" },
  { code: "fr", nameEn: "French",           flag: "🇫🇷" },
  { code: "ja", nameEn: "Japanese",         flag: "🇯🇵" },
] as const;

export type SupportedLangCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

/** Ordered tuple of supported language codes — safe to use in Zod enum. */
export const SUPPORTED_LANG_CODES = [
  "ar", "en", "es", "zh", "de", "fr", "ja",
] as const satisfies readonly [string, ...string[]];

/** Emoji flag lookup — only for the 7 supported learning languages. */
export const LANG_FLAG: Record<string, string> = {
  ar: "🇸🇦",
  en: "🇬🇧",
  es: "🇪🇸",
  zh: "🇨🇳",
  de: "🇩🇪",
  fr: "🇫🇷",
  ja: "🇯🇵",
};

/** CEFR proficiency levels in ascending order. */
export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export type CefrLevel = (typeof CEFR_LEVELS)[number];
