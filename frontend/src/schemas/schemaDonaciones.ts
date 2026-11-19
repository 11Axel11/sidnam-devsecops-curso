import z from "zod";

export const crearRegistroDonacionSchema = z.object({
    cedula: z
      .string()
      .regex(/^\d+$/, "Solo se permiten números")
      .nonempty("La cédula es obligatoria")
      .min(9, "La cédula debe tener al menos 9 dígitos")
      .max(15, "La cédula debe tener al menos 15 dígitos"),
    nombre: z.string().nonempty("El nombre es obligatorio"),
    apellido1: z.string().nonempty("El primer apellido es obligatorio"),
    apellido2: z.string().optional(),
    email: z.string().nonempty("El correo es obligatorio").email("Correo inválido"),
    telefono: z.string().nonempty("El teléfono es obligatorio").regex(/^\+?\d+$/, "Solo se permiten números y un + opcional al inicio").min(7, "El teléfono debe tener al menos 8 dígitos").max(16, "El teléfono debe tener como máximo 16 dígitos"),
    anonimo: z.boolean().optional(),
    tipoDonacion: z.string().nonempty("El tipo de donación es obligatorio"),
    descripcion: z.string().nonempty("La descripción de la donación es obligatoria"),
    observaciones: z.string().optional(),
  });
  
  export type CrearRegistroDonacionInput = z.infer<typeof crearRegistroDonacionSchema>;