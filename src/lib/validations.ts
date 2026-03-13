import { z } from "zod";
import { SUPPORTED_LANG_CODES, CEFR_LEVELS } from "@/constants/languages";

// Cast satisfies the Zod enum tuple requirement [T, ...T[]]
const VALID_LANGS = SUPPORTED_LANG_CODES as unknown as [string, ...string[]];
const VALID_CEFR  = CEFR_LEVELS        as unknown as [string, ...string[]];

export const registerSchema = z.object({
  name:     z.string().min(2).max(100).trim(),
  email:    z.string().email().toLowerCase().trim(),
  password: z.string().min(8).max(128),
});

export const chatMessageSchema = z.object({
  message:        z.string().min(1).max(2000).trim(),
  conversationId: z.string().optional(),
});

export const profileSchema = z.object({
  name: z.string().min(2).max(100).trim(),
});

export const languagesSchema = z.object({
  targetLang: z.enum(VALID_LANGS),
  nativeLang: z.enum(VALID_LANGS),
  cefrLevel:  z.enum(VALID_CEFR).optional(),
});

export const createTransactionSchema = z.object({
  priceId: z.string().min(1).max(200),
  userId:  z.string().min(1).max(200),
  email:   z.string().email(),
});
