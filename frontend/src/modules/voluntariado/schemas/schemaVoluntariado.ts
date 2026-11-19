import { isFutureLocal } from "@/utils/validateFutureDates";
import z from "zod";

export const crearExpedienteVoluntariadoSchema = z.object({
  cedula: z.string().min(9, "La cédula debe tener al menos 9 dígitos")
    .max(20, "La cédula no puede tener más de 20 dígitos"),
  nombre: z.string().nonempty("El nombre es obligatorio").
    max(50, "El nombre no puede tener más de 50 caracteres"),
  apellido1: z.string().nonempty("El primer apellido es obligatorio").
    max(50, "El primer apellido no puede tener más de 50 caracteres"),
  apellido2: z.string().max(50, "El segundo apellido no puede tener más de 50 caracteres").optional(),
  email: z.string().nonempty("El correo es obligatorio").email("Correo inválido"),
  telefono: z.string().max(15, "El teléfono no puede tener más de 15 caracteres").nonempty("El teléfono es obligatorio"),
  ocupacion: z.string().max(50, "La ocupación no puede tener más de 50 caracteres").nonempty("La ocupación es obligatoria"),
  direccion: z.string().max(100, "La dirección no puede tener más de 100 caracteres").nonempty("La dirección es obligatoria"),
  sexo: z.string().nonempty("Seleccione el sexo"),
  experienciaLaboral: z.string().nonempty("Este campo es obligatorio"),
  tipoVoluntariado: z.union([z.string(), z.number()]).refine((val) => val !== "", {
    message: "Seleccione un tipo de voluntariado",
  }),

  contactosEmergencia: z
    .array(
      z.object({
        nombre: z.string().max(50, "El nombre no puede tener más de 50 caracteres").nonempty("Nombre obligatorio"),
        telefono: z.string().max(15, "El teléfono no puede tener más de 15 caracteres").nonempty("Teléfono obligatorio"),
      }),
    )
    .min(1, "Debe agregar al menos un contacto"),
  cantidadHoras: z.number().optional(),

  horarios: z
    .array(
      z.object({
        dia: z.string(),
        horaInicio: z.string(),
        horaFin: z.string(),
      }),
    )
    .optional(),
  observaciones: z.string().optional(),
});

export type VoluntariadoInput = z.infer<typeof crearExpedienteVoluntariadoSchema>;

export const actividadesSchema = z.object({
  fecha: z.string().nonempty("La fecha es obligatoria"),
  actividades: z.string().nonempty("La descripción de las actividades es obligatoria"),
  cantidadHoras: z.number().int().positive("La cantidad de horas debe ser un número positivo"),
});

export type ActividadesInput = z.infer<typeof actividadesSchema>;

export const edtiarActividadesSchema = z.object({
  fecha: z
    .string()
    .nonempty("La fecha es obligatoria")
    .refine((v) => !isFutureLocal(v), { message: "La fecha no puede ser futura" }),
  actividades: z.string(),
  cantidadHoras: z.number().int().positive("La cantidad de horas debe ser un número positivo"),
});

export type EditarActividadesInput = z.infer<typeof edtiarActividadesSchema>;


export const editarExpedienteSchema = z.object({
  cedula: z
    .string()
    .regex(/^\d+$/, "Solo se permiten números")
    .optional(),

  nombre: z.string().optional(),
  apellido1: z.string().optional(),
  apellido2: z.string().optional(),
  email: z.string().email("Correo inválido").optional(),
  telefono: z.string().optional(),
  ocupacion: z.string().optional(),
  direccion: z.string().optional(),
  sexo: z.string().optional(),
  experienciaLaboral: z.string().optional(),

  contactosEmergencia: z
    .array(
      z.object({
        nombre: z
          .string()
          .max(50, "El nombre no puede tener más de 50 caracteres")
          .nonempty("Nombre obligatorio"),
        telefono: z
          .string()
          .max(15, "El teléfono no puede tener más de 15 caracteres")
          .nonempty("Teléfono obligatorio"),
      })
    )
    .min(1, "Debe agregar al menos un contacto"),

  cantidadHoras: z
    .union([z.string(), z.number()])
    .transform((val) => (val === undefined ? undefined : String(val)))
    .optional(),

  horarios: z
    .array(
      z.object({
        dia: z.string(),
        horaInicio: z.string(),
        horaFin: z.string(),
      }),
    )
    .optional(),
  observaciones: z.string().optional(),
});

export type EditarExpedienteInput = z.infer<typeof editarExpedienteSchema>;
