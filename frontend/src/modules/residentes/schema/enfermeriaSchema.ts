import { z } from "zod";

export const bitacoraSchema = z.object({
    titulo: z.string().min(1, "El título es obligatorio"),
    textoCompleto: z.string().min(1, "El texto completo es obligatorio"),
});

export type BitacoraFormValues = z.infer<typeof bitacoraSchema>;

export const EDUSschema = z.object({
    password: z.string().min(1, "La contraseña es obligatoria")
    .max(25, "La contraseña no puede tener más de 25 caracteres"),
});

export type EDUSFormValues = z.infer<typeof EDUSschema>;
