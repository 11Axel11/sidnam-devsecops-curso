import z from "zod";

export const ROLE_NAME_MAX_LENGTH = 15;
export const ROLE_DESCRIPTION_MAX_LENGTH = 100;

export const crearRolSchema = z.object({
    nombre: z.string().max(ROLE_NAME_MAX_LENGTH, "El nombre del rol no puede exceder los 15 carácteres").nonempty("El nombre es obligatorio"),
    descripcion: z.string().max(ROLE_DESCRIPTION_MAX_LENGTH, "La descripción no puede exceder los 100 carácteres").nonempty("La descripción del rol es obligatoria"),
});

export type CrearRolInput = z.infer<typeof crearRolSchema>;

export const editarRolSchema = z.object({
    nombre: z.string().max(ROLE_NAME_MAX_LENGTH, "El nombre del rol no puede exceder los 15 carácteres").nonempty("El nombre es obligatorio"),
    descripcion: z.string().max(ROLE_DESCRIPTION_MAX_LENGTH, "La descripción no puede exceder los 100 carácteres").optional(),
});

export type EditarRolForm = z.infer<typeof editarRolSchema>;