import z from "zod";

export const crearUsuarioSchema = z.object({
    cedula: z
        .string()
        .min(9, "La cédula debe contener al menos 9 dígitos")
        .regex(/^\d{5,12}$/, "Ingrese una cédula válida"),
    name: z.string().min(2, "El nombre es obligatorio").max(20, "El nombre no puede exceder 20 carácteres."),
    apellido1: z.string().min(2, "El primer apellido es obligatorio").max(20, "El primer apellido no puede exceder 20 carácteres."),
    apellido2: z.string().max(20, "El segundo apellido no puede exceder 20 carácteres.").optional().default(""),
    email: z.email("Correo inválido").max(254, "El email es demasiado largo"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
    idRol: z.coerce.number().int().positive("Selecciona un rol"),
});

export type CrearUsuarioValues = z.infer<typeof crearUsuarioSchema>;

export const editarPerfilSchema = z.object({
    cedula: z
        .string()
        .regex(/^\d{5,12}$/, "Ingrese una cédula válida").optional(),
    name: z.string().min(2, "El nombre es obligatorio").max(20, "El nombre no puede exceder 15 carácteres.").optional(),
    apellido1: z.string().min(2, "El primer apellido es obligatorio").max(20, "El primer apellido no puede exceder 20 carácteres.").optional(),
    apellido2: z.string().max(20, "El segundo apellido no puede exceder 20 carácteres.").optional().default(""),
    email: z.email("Correo inválido").max(254, "El email es demasiado largo").optional(),
});

export type editarPerfilValues = z.infer<typeof editarPerfilSchema>;