import z from "zod";
import { NOMBRE_MAX } from "../catalogosConfig";

export const itemCatalogoSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(NOMBRE_MAX, `El nombre no puede tener más de ${NOMBRE_MAX} caracteres`),
});

export type ItemCatalogoInput = z.infer<typeof itemCatalogoSchema>;
