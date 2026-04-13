/**
 * chatUtils.ts
 *
 * ChatInterface bileşeninden bağımsız, saf (pure) UI yardımcı fonksiyonları.
 * Test edilebilir ve yeniden kullanılabilir.
 */

/**
 * Mesaj düzeltme metnini parçalarına ayırır.
 * Format: "✏️ [original] → [corrected] — [rule]"
 */
export function parseCorrection(
  text: string
): { original: string; corrected: string; rule: string } | null {
  const cleaned = text.replace(/^✏️\s*/, "").trim();
  const arrowIdx = cleaned.indexOf("→");
  if (arrowIdx === -1) return null;
  const original = cleaned.slice(0, arrowIdx).trim();
  const rest = cleaned.slice(arrowIdx + 1).trim();
  const dashIdx = rest.indexOf("—");
  if (dashIdx === -1) return { original, corrected: rest, rule: "" };
  return {
    original,
    corrected: rest.slice(0, dashIdx).trim(),
    rule: rest.slice(dashIdx + 1).trim(),
  };
}

/**
 * Konuşma başlığını döndürür.
 * Öncelik: topicLabel → ilk mesaj içeriği → tarih.
 */
export function getConvTitle(
  conv: { topicLabel?: string | null; messages: { content: string }[]; createdAt: string },
  locale: string
): string {
  if (conv.topicLabel) return conv.topicLabel;
  const first = conv.messages[0];
  if (!first) return new Date(conv.createdAt).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US");
  return first.content.length > 28 ? `${first.content.slice(0, 28)}…` : first.content;
}

/**
 * Göreli zaman metni döndürür (örn: "3 dakika önce").
 */
export function getRelativeTime(dateStr: string, locale: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins   = Math.floor(diffMs / 60000);
  const hours  = Math.floor(mins / 60);
  const days   = Math.floor(hours / 24);
  const rtf    = new Intl.RelativeTimeFormat(locale === "tr" ? "tr" : "en", { numeric: "auto" });
  if (mins  < 1)  return rtf.format(0, "seconds");
  if (mins  < 60) return rtf.format(-mins,  "minutes");
  if (hours < 24) return rtf.format(-hours, "hours");
  if (days  < 7)  return rtf.format(-days,  "days");
  return new Date(dateStr).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US");
}

/**
 * Dil kodunu Web Speech API formatına çevirir.
 */
export function toSpeechLang(code: string): string {
  const c = code.toLowerCase();
  const map: Record<string, string> = {
    en: "en-US", tr: "tr-TR", de: "de-DE", fr: "fr-FR",
    es: "es-ES", ja: "ja-JP", zh: "zh-CN", "zh-cn": "zh-CN",
  };
  return map[c] ?? code;
}

/**
 * Verilen dil koduna uygun ses sesini döndürür.
 */
export function pickVoice(langCode: string): SpeechSynthesisVoice | undefined {
  const voices = typeof window !== "undefined" ? window.speechSynthesis.getVoices?.() ?? [] : [];
  const desired = langCode.toLowerCase();
  return voices.find((v) => v.lang.toLowerCase().startsWith(desired)) ?? voices[0];
}
