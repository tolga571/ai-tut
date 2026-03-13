import { z } from "zod";

const VALID_LANGS = [
  "en", "tr", "de", "fr", "es", "it", "pt", "ru", "zh", "ja", "ko", "ar",
] as const;

export const registerSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8).max(128),
});

export const chatMessageSchema = z.object({
  message: z.string().min(1).max(2000).trim(),
  conversationId: z.string().optional(),
});

export const profileSchema = z.object({
  name: z.string().min(2).max(100).trim(),
});

export const languagesSchema = z.object({
  targetLang: z.enum(VALID_LANGS),
  nativeLang: z.enum(VALID_LANGS),
});

export const createTransactionSchema = z.object({
  priceId: z.string().min(1).max(200),
  userId: z.string().min(1).max(200),
  email: z.string().email(),
});
