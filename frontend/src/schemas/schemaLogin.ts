import { z } from 'zod';

export const loginSchema = z.object({
  cedula: z.string()
    .min(9, { message: 'La cédula debe tener al menos 9 dígitos' })
    .regex(/^\d+$/, { message: 'La cédula debe contener solo números' }),
  password: z.string().min(5, { message: 'Mínimo 5 caracteres' }),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const resetPasswordSchema = z.object({
  password: z.string().min(5, { message: 'Mínimo 5 caracteres' }),
});

export type ResetInput = z.infer<typeof resetPasswordSchema>;

export const forgotPasswordSchema = z.object({
   email: z.string().trim().email("Correo electrónico inválido"),
});
export type forgotInput = z.infer<typeof forgotPasswordSchema>;
