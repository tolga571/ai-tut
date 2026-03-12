import { z } from "zod";

export const sendMessageSchema = z.object({
  message: z
    .string()
    .min(1, "Mesaj boş olamaz")
    .max(2000, "Mesaj en fazla 2000 karakter olabilir")
    .trim(),
  conversationId: z.string().cuid().nullable().optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
