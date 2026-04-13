/**
 * chatTopics.ts
 *
 * Chat modülüne ait statik sabit veriler.
 * Bileşen dışında tanımlanarak yeniden kullanılabilir hale getirilmiştir.
 */

export const CHAT_TOPICS = [
  { id: "cafe",          label: "Kafede sipariş",  description: "Baristadan kahve siparişi ver.", icon: "☕" },
  { id: "travel-hotel",  label: "Otel resepsiyonu", description: "Check-in, oda ve kahvaltı.",    icon: "✈️" },
  { id: "job-interview", label: "İş görüşmesi",     description: "Kendini tanıt, deneyimlerini anlat.", icon: "💼" },
  { id: "friends",       label: "Günlük sohbet",    description: "Günlük hayat ve planlar.",       icon: "🌤️" },
  { id: "small-talk",    label: "Small talk",        description: "Hava durumu, hobiler.",          icon: "🗣️" },
] as const;

export type ChatTopicId = typeof CHAT_TOPICS[number]["id"];

export const TOPIC_ICONS: Record<string, string> = Object.fromEntries(
  CHAT_TOPICS.map((t) => [t.id, t.icon])
);

export const CEFR_GRAMMAR: Record<string, {
  title: string;
  session: string;
  topics: { label: string; done: boolean }[];
}> = {
  A1: { title: "Present Simple",   session: "Temel Zaman Kipi",    topics: [{ label: "Özne + fiil yapısı", done: true }, { label: "Olumlu/Olumsuz cümle", done: true }, { label: "Soru cümlesi", done: false }] },
  A2: { title: "Past Simple",      session: "Geçmiş Zaman",        topics: [{ label: "Regular Verbs (-ed)", done: true }, { label: "Irregular Verbs", done: true }, { label: "Was / Were", done: false }] },
  B1: { title: "Present Perfect",  session: "Deneyim & Sonuç",     topics: [{ label: "Have / Has kullanımı", done: true }, { label: "Regular past participle", done: true }, { label: "Irregular verbs", done: false }] },
  B2: { title: "Conditionals",     session: "Koşul Cümleleri",     topics: [{ label: "Zero & First Conditional", done: true }, { label: "Second Conditional", done: true }, { label: "Third Conditional", done: false }] },
  C1: { title: "Advanced Modals",  session: "İleri Kiplik Fiiller", topics: [{ label: "Deduction & Speculation", done: true }, { label: "Perfect Modals", done: true }, { label: "Passive Modals", done: false }] },
  C2: { title: "Nuance & Style",   session: "Üst Düzey Üslup",    topics: [{ label: "Inversion structures", done: true }, { label: "Cleft sentences", done: false }, { label: "Discourse markers", done: false }] },
};

export const MAX_CHARS = 2000;
export const DAILY_GOAL = 20;
export const CONVERSATIONS_CACHE_KEY_PREFIX = "chat_conversations_cache_v1";
