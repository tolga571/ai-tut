/**
 * chatHelpers.ts
 *
 * Chat API için saf (pure) yardımcı fonksiyonlar.
 * Route handler'dan bağımsız olarak test edilebilir.
 */

// ─── Tipler ───────────────────────────────────────────────────────────────────

export type UserMemory = {
  learningGoal?: string | null;
  interestArea?: string | null;
  knownWords?: string[];
  recentMistakes?: string[];
};

export type LearnedWord = { word: string; definition: string };

// ─── buildMemoryBlock ─────────────────────────────────────────────────────────

/**
 * UserMemory verisini AI system prompt'una eklenecek
 * yapılandırılmış bir metin bloğuna dönüştürür.
 * Tüm alanlar opsiyoneldir; boş memory → "" döner.
 */
export function buildMemoryBlock(memory: UserMemory): string {
  const lines: string[] = [];

  if (memory.learningGoal) {
    lines.push(
      `- Learning goal: "${memory.learningGoal}" — tailor conversation topics and context to serve this goal.`
    );
  }
  if (memory.interestArea) {
    lines.push(
      `- Interest area: "${memory.interestArea}" — naturally weave related vocabulary, examples, and scenarios into the conversation when appropriate.`
    );
  }
  if (memory.knownWords && memory.knownWords.length > 0) {
    lines.push(
      `- Vocabulary already saved by this student: ${memory.knownWords.join(", ")}. Feel free to reuse these words naturally, or reference them when relevant ("you've seen this word before").`
    );
  }
  if (memory.recentMistakes && memory.recentMistakes.length > 0) {
    const list = memory.recentMistakes.map((c) => `  • ${c}`).join("\n");
    lines.push(
      `- Recent grammar/spelling patterns this student has struggled with:\n${list}\n  → If the student repeats a similar mistake, warmly acknowledge it: "We've worked on this before —" and give extra encouragement alongside the correction.`
    );
  }

  if (lines.length === 0) return "";
  return `\n\nUSER MEMORY & PERSONALIZATION:\n${lines.join("\n")}`;
}

// ─── getTopicInstruction ──────────────────────────────────────────────────────

/**
 * Senaryo ID'sine göre AI rol talimatını döner.
 * Bilinmeyen topicId → "" (boş string).
 */
export function getTopicInstruction(
  topicId: string | undefined,
  targetLang: string
): string {
  switch (topicId) {
    case "cafe":
      return `Role-play a friendly barista in a café. Talk about coffee, pastries and light small talk in ${targetLang}.`;
    case "travel-hotel":
      return `Role-play a hotel receptionist. Help the guest with check-in, room preferences and local tips in ${targetLang}.`;
    case "job-interview":
      return `You are an interviewer in a job interview. Ask professional questions and give feedback in ${targetLang}.`;
    case "friends":
      return `You are a close friend chatting casually about daily life, plans and feelings in ${targetLang}.`;
    case "small-talk":
      return `Have light small talk about weather, hobbies and weekend plans in ${targetLang}.`;
    default:
      return "";
  }
}

// ─── normalizeLearnedWords ────────────────────────────────────────────────────

/**
 * AI'dan gelen ham "words" verisini doğrular ve tipli diziye dönüştürür.
 * Her eleman { word: string, definition: string } şeklinde olmalı.
 * Geçersiz elemanlar filtrelenir; null/undefined → [].
 */
export function normalizeLearnedWords(raw: unknown): LearnedWord[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (w): w is LearnedWord =>
      typeof w === "object" &&
      w !== null &&
      typeof (w as Record<string, unknown>).word === "string" &&
      typeof (w as Record<string, unknown>).definition === "string"
  );
}

// ─── stripCorrectionEmoji ─────────────────────────────────────────────────────

/**
 * Düzeltme metninin başındaki "✏️ " ön ekini temizler.
 * Boş/nullish → "".
 */
export function stripCorrectionEmoji(correction: string | null | undefined): string {
  if (!correction) return "";
  return correction.replace(/^✏️\s*/, "").trim();
}
