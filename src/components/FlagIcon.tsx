const LANG_TO_COUNTRY: Record<string, string> = {
  af: "za",
  ar: "sa",
  bn: "bd",
  de: "de",
  el: "gr",
  // "en" (UI/learning language) -> USA flag for English
  en: "us",
  es: "es",
  fa: "ir",
  fi: "fi",
  fr: "fr",
  gu: "in",
  hi: "in",
  id: "id",
  it: "it",
  ja: "jp",
  ko: "kr",
  ms: "my",
  mr: "in",
  nl: "nl",
  no: "no",
  pa: "in",
  pl: "pl",
  pt: "pt",
  ro: "ro",
  ru: "ru",
  sv: "se",
  sw: "tz",
  ta: "in",
  th: "th",
  tr: "tr",
  uk: "ua",
  ur: "pk",
  vi: "vn",
  zh: "cn",
};

export function getCountryFromLanguage(code?: string | null): string | null {
  if (!code) return null;
  return LANG_TO_COUNTRY[code.toLowerCase()] ?? null;
}

type FlagIconProps = {
  code?: string | null;
  className?: string;
};

export function FlagIcon({ code, className = "w-5 h-4" }: FlagIconProps) {
  const country = getCountryFromLanguage(code);
  if (!country) return <span className="text-sm">🌐</span>;

  return (
    <img
      src={`https://flagcdn.com/${country}.svg`}
      alt={`${code?.toUpperCase() ?? "LANG"} flag`}
      className={`${className} inline-block rounded-[2px] object-cover align-middle`}
      loading="lazy"
      decoding="async"
    />
  );
}

