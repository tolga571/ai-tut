/**
 * Browser SpeechSynthesis helpers — warmer, less “flat” delivery within API limits.
 * True intonation is engine-dependent; sentence chunking + pacing + rate/pitch help.
 */

export const WARM_TTS = {
  /** Slightly slower than default — often sounds less rushed / robotic */
  rate: 0.88,
  /** Slightly below 1 can read as softer on some engines */
  pitch: 0.97,
  /** Pause between sentence chunks (ms) — like a short breath */
  interChunkMs: 130,
} as const;

/**
 * Split on sentence boundaries so each chunk is spoken separately (natural pauses).
 * Falls back to a single chunk if nothing matches.
 */
export function splitTextForSpeechPauses(text: string): string[] {
  const t = text.trim();
  if (!t) return [];

  try {
    const parts = t.split(/(?<=[.!?。！？…])\s+/u).filter((s) => s.trim().length > 0);
    if (parts.length <= 1) return [t];
    return parts.map((s) => s.trim());
  } catch {
    return [t];
  }
}
