import { z } from "zod";

export const createTransactionSchema = z.object({
  priceId: z.string().min(1, "Price ID gereklidir"),
  userId: z.string().cuid("Geçersiz kullanıcı ID"),
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
