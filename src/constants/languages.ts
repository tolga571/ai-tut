/**
 * Language scopes -- three distinct sets:
 *
 * UI_LANG_CODES      -- 7 languages that drive next-intl routing and messages/*.json
 * DOC_LANG_CODES     -- same 7 -- restricts document post language selection
 * LEARNING_LANGUAGES -- ~35 world languages -- unrestricted for nativeLang / targetLang
 */

// UI / Documentation languages (7 fixed)

export const UI_LANG_CODES = [
  'ar', 'de', 'en', 'es', 'fr', 'ja', 'zh',
] as const satisfies readonly [string, ...string[]];

/** Same set as UI_LANG_CODES -- restricts document post language. */
export const DOC_LANG_CODES = UI_LANG_CODES;

/** Backwards-compatible alias for existing imports. */
export const SUPPORTED_LANG_CODES = UI_LANG_CODES;

export type SupportedLangCode = (typeof UI_LANG_CODES)[number];

export const SUPPORTED_LANGUAGES = [
  { code: 'ar', nameEn: 'Arabic',           flag: '🇸🇦' },
  { code: 'de', nameEn: 'German',           flag: '🇩🇪' },
  { code: 'en', nameEn: 'English',          flag: '🇬🇧' },
  { code: 'es', nameEn: 'Spanish',          flag: '🇪🇸' },
  { code: 'fr', nameEn: 'French',           flag: '🇫🇷' },
  { code: 'ja', nameEn: 'Japanese',         flag: '🇯🇵' },
  { code: 'zh', nameEn: 'Mandarin Chinese', flag: '🇨🇳' },
] as const;

// Learning languages (unrestricted -- ~35 world languages)

export const LEARNING_LANGUAGES = [
  { code: 'af', nameEn: 'Afrikaans' },
  { code: 'ar', nameEn: 'Arabic' },
  { code: 'bn', nameEn: 'Bengali' },
  { code: 'zh', nameEn: 'Mandarin Chinese' },
  { code: 'nl', nameEn: 'Dutch' },
  { code: 'en', nameEn: 'English' },
  { code: 'fi', nameEn: 'Finnish' },
  { code: 'fr', nameEn: 'French' },
  { code: 'de', nameEn: 'German' },
  { code: 'el', nameEn: 'Greek' },
  { code: 'gu', nameEn: 'Gujarati' },
  { code: 'hi', nameEn: 'Hindi' },
  { code: 'id', nameEn: 'Indonesian' },
  { code: 'it', nameEn: 'Italian' },
  { code: 'ja', nameEn: 'Japanese' },
  { code: 'ko', nameEn: 'Korean' },
  { code: 'ms', nameEn: 'Malay' },
  { code: 'mr', nameEn: 'Marathi' },
  { code: 'no', nameEn: 'Norwegian' },
  { code: 'fa', nameEn: 'Persian (Farsi)' },
  { code: 'pl', nameEn: 'Polish' },
  { code: 'pt', nameEn: 'Portuguese' },
  { code: 'pa', nameEn: 'Punjabi' },
  { code: 'ro', nameEn: 'Romanian' },
  { code: 'ru', nameEn: 'Russian' },
  { code: 'es', nameEn: 'Spanish' },
  { code: 'sw', nameEn: 'Swahili' },
  { code: 'sv', nameEn: 'Swedish' },
  { code: 'ta', nameEn: 'Tamil' },
  { code: 'th', nameEn: 'Thai' },
  { code: 'tr', nameEn: 'Turkish' },
  { code: 'uk', nameEn: 'Ukrainian' },
  { code: 'ur', nameEn: 'Urdu' },
  { code: 'vi', nameEn: 'Vietnamese' },
] as const;

// Emoji flag lookup (covers all learning languages)

export const LANG_FLAG: Record<string, string> = {
  af: '🇿🇦', ar: '🇸🇦', bn: '🇧🇩', zh: '🇨🇳', nl: '🇳🇱',
  en: '🇬🇧', fi: '🇫🇮', fr: '🇫🇷', de: '🇩🇪', el: '🇬🇷',
  gu: '🇮🇳', hi: '🇮🇳', id: '🇮🇩', it: '🇮🇹', ja: '🇯🇵',
  ko: '🇰🇷', ms: '🇲🇾', mr: '🇮🇳', no: '🇳🇴', fa: '🇮🇷',
  pl: '🇵🇱', pt: '🇵🇹', pa: '🇮🇳', ro: '🇷🇴', ru: '🇷🇺',
  es: '🇪🇸', sw: '🇹🇿', sv: '🇸🇪', ta: '🇮🇳', th: '🇹🇭',
  tr: '🇹🇷', uk: '🇺🇦', ur: '🇵🇰', vi: '🇻🇳',
};

// CEFR levels

export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];
