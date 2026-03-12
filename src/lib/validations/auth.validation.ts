import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "İsim en az 2 karakter olmalıdır")
    .max(100, "İsim en fazla 100 karakter olabilir")
    .trim(),
  email: z
    .string()
    .email("Geçerli bir e-posta adresi giriniz")
    .toLowerCase(),
  password: z
    .string()
    .min(8, "Şifre en az 8 karakter olmalıdır")
    .max(128, "Şifre en fazla 128 karakter olabilir")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Şifre en az bir büyük harf, bir küçük harf ve bir rakam içermelidir"
    ),
});

export type RegisterInput = z.infer<typeof registerSchema>;
