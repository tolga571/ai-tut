import { z } from "zod";
import { CEFR_LEVELS, DOC_LANG_CODES } from "@/constants/languages";

const VALID_CEFR = CEFR_LEVELS as unknown as [string, ...string[]];

export const registerSchema = z.object({
  name:     z.string().min(2).max(100).trim(),
  email:    z.string().email().toLowerCase().trim(),
  password: z.string().min(8).max(128),
});

export const chatMessageSchema = z.object({
  message:        z.string().min(1).max(2000).trim(),
  conversationId: z.string().optional(),
  topicId:        z.string().optional(),
});

export const profileSchema = z.object({
  name: z.string().min(2).max(100).trim(),
});

export const languagesSchema = z.object({
  targetLang: z.string().min(2).max(10).trim(),
  nativeLang: z.string().min(2).max(10).trim(),
  cefrLevel:  z.enum(VALID_CEFR).optional(),
});

export const postSchema = z.object({
  title:     z.string().min(1).max(200).trim(),
  slug:      z.string().min(1).max(200).trim().regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens"),
  content:   z.string().min(1).trim(),
  category:  z.enum(["blog", "page", "document"]),
  language:  z.string().min(2).max(10).trim(),
  published: z.boolean().default(false),
  isPremium: z.boolean().default(false),
}).superRefine((data, ctx) => {
  if (
    data.category === "document" &&
    !(DOC_LANG_CODES as readonly string[]).includes(data.language)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Documents must use one of: ${DOC_LANG_CODES.join(", ")}`,
      path: ["language"],
    });
  }
});

export const createTransactionSchema = z.object({
  priceId: z.string().min(1).max(200),
  userId:  z.string().min(1).max(200),
  email:   z.string().email(),
});
