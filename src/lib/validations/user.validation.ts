import { z } from "zod";
import { SUPPORTED_LANGUAGE_CODES } from "@/constants/languages";

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, "İsim en az 2 karakter olmalıdır")
    .max(100, "İsim en fazla 100 karakter olabilir")
    .trim(),
});

export const updateLanguagesSchema = z.object({
  nativeLang: z.enum(SUPPORTED_LANGUAGE_CODES, {
    message: "Desteklenmeyen dil kodu",
  }),
  targetLang: z.enum(SUPPORTED_LANGUAGE_CODES, {
    message: "Desteklenmeyen dil kodu",
  }),
}).refine((data) => data.nativeLang !== data.targetLang, {
  message: "Ana dil ve hedef dil aynı olamaz",
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateLanguagesInput = z.infer<typeof updateLanguagesSchema>;
