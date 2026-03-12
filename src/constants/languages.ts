export const LANGUAGES = [
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "en", label: "İngilizce", flag: "🇬🇧" },
  { code: "de", label: "Almanca", flag: "🇩🇪" },
  { code: "fr", label: "Fransızca", flag: "🇫🇷" },
  { code: "es", label: "İspanyolca", flag: "🇪🇸" },
  { code: "it", label: "İtalyanca", flag: "🇮🇹" },
  { code: "pt", label: "Portekizce", flag: "🇵🇹" },
  { code: "ru", label: "Rusça", flag: "🇷🇺" },
  { code: "zh", label: "Çince", flag: "🇨🇳" },
  { code: "ja", label: "Japonca", flag: "🇯🇵" },
  { code: "ar", label: "Arapça", flag: "🇸🇦" },
  { code: "ko", label: "Korece", flag: "🇰🇷" },
] as const;

export const SUPPORTED_LANGUAGE_CODES = [
  "tr", "en", "de", "fr", "es", "it", "pt", "ru", "zh", "ja", "ar", "ko",
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGE_CODES)[number];

export const LANG_LABELS: Record<LanguageCode, string> = {
  tr: "Türkçe",
  en: "İngilizce",
  de: "Almanca",
  fr: "Fransızca",
  es: "İspanyolca",
  it: "İtalyanca",
  pt: "Portekizce",
  ru: "Rusça",
  zh: "Çince",
  ja: "Japonca",
  ar: "Arapça",
  ko: "Korece",
};

export const LANG_FLAGS: Record<LanguageCode, string> = {
  tr: "🇹🇷",
  en: "🇬🇧",
  de: "🇩🇪",
  fr: "🇫🇷",
  es: "🇪🇸",
  it: "🇮🇹",
  pt: "🇵🇹",
  ru: "🇷🇺",
  zh: "🇨🇳",
  ja: "🇯🇵",
  ar: "🇸🇦",
  ko: "🇰🇷",
};
