import z from "zod";
export const crearExpedienteResidenteSchema = z.object({
  tipo_pension: z.coerce.number()
    .refine(val => !isNaN(val) && val > 0, {
      message: 'Debe seleccionar un tipo de pensión'
    }),
  fecha_ingreso: z.string().min(1, 'Este campo es obligatorio'),
  residente: z.object({
    cedula: z.string()
      .min(9, "La cédula debe tener al menos 9 dígitos")
      .max(20, "La cédula no puede tener más de 20 dígitos"),

    nombre: z.string()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(50, "El nombre no puede tener más de 50 caracteres"),

    apellido1: z.string()
      .min(2, "El primer apellido debe tener al menos 2 caracteres")
      .max(50, "El primer apellido no puede tener más de 50 caracteres"),

    apellido2: z.string().max(100, "El segundo apellido no puede tener más de 100 caracteres").optional(),
    email: z.union([z.string().email("Debe ser un correo electrónico válido"), z.literal('')]).optional(),

    sexo: z.string()
      .min(1, 'Debe seleccionar el sexo')
      .refine(val => val === 'M' || val === 'F', {
        message: 'Debe seleccionar M o F'
      }),

    fecha_nacimiento: z.string().min(1, 'Este campo es obligatorio'),
    edad: z.coerce.number().refine(val => !isNaN(val), { message: 'Este campo es obligatorio' }),
    lineaPobreza: z.coerce.number()
      .refine(val => !isNaN(val) && val > 0, {
        message: 'Debe seleccionar una línea de pobreza'
      }),
    estado_civil: z.coerce.number()
      .refine(val => !isNaN(val) && val > 0, {
        message: 'Debe seleccionar un estado civil'
      }),

    dependencia: z.coerce.number()
      .refine(val => !isNaN(val) && val > 0, {
        message: "Debe seleccionar un tipo de dependencia"
      }),

    encargados: z.array(
      z.object({
        cedula: z.string()
          .min(9, "La cédula debe tener al menos 9 dígitos")
          .max(20, "La cédula no puede tener más de 20 dígitos")
          .regex(/^\d+$/, "La cédula debe contener solo números"),
        nombre: z.string().min(1, 'Este campo es obligatorio'),
        apellido1: z.string().min(1, 'Este campo es obligatorio'),
        apellido2: z.string().max(100, "El segundo apellido no puede tener más de 100 caracteres").optional(),
        telefono: z.string()
          .min(8, "El teléfono debe tener al menos 8 dígitos")
          .max(15, "El teléfono no puede tener más de 15 caracteres"),
        correo: z.union([z.string().email("Debe ser un correo electrónico válido"), z.literal('')]).optional(),
      })
    ).nonempty({ message: 'Debe agregar al menos un encargado' }),
  }),
});

export type crearExpedienteResidenteInput = z.infer<typeof crearExpedienteResidenteSchema>;


export const editarExpedienteResidenteSchema = z.object({
  cedula: z.string()
    .min(9, "La cédula debe tener al menos 9 dígitos")
    .max(20, "La cédula no puede tener más de 20 dígitos")
    .regex(/^\d+$/, "La cédula debe contener solo números").optional(),

  nombre: z.string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(50, "El nombre no puede tener más de 50 caracteres").optional(),

  apellido1: z.string()
    .min(2, "El primer apellido debe tener al menos 2 caracteres")
    .max(50, "El primer apellido no puede tener más de 50 caracteres").optional(),

  apellido2: z.string()
    .max(100, "El segundo apellido no puede tener más de 100 caracteres").optional(),

  correo: z.union([z.string().email("Debe ser un correo electrónico válido"), z.literal('')]).optional(),

  fecha_nacimiento: z.string().optional(),

  tipo_pension: z.coerce.number().optional(),
  lineaPobreza: z.coerce.number().optional(),
  fecha_ingreso: z.string().optional(),
  sexo: z.string().optional(),
  edad: z.coerce.number().optional(),
  estado_civil: z.coerce.number().optional(),
  dependencia: z.coerce.number().optional(),

  encargados: z.array(
    z.object({
      id: z.number().optional(),
      cedula: z.string()
        .max(20, "La cédula no puede tener más de 20 dígitos").optional(),
      nombre: z.string().optional(),
      apellido1: z.string().optional(),
      apellido2: z.string().max(100, "El segundo apellido no puede tener más de 100 caracteres").optional(),
      telefono: z.string()
        .min(8, "El teléfono debe tener al menos 8 dígitos")
        .max(15, "El teléfono no puede tener más de 15 caracteres").optional(),
      correo: z.union([z.string().email("Debe ser un correo electrónico válido"), z.literal('')]).optional(),
    })
  ).optional(),
});

export type editarExpedienteResidenteInput = z.infer<typeof editarExpedienteResidenteSchema>;

export const schemaSalidaConFamiliar = z.object({
    parentesco: z.string().min(1, "El parentesco es requerido").max(100, "Máximo 100 caracteres"),
    fechaSalida: z.string().min(1, "La fecha de salida es requerida"),
    horaSalida: z.string().min(1, "La hora de salida es requerida"),
    fechaRegreso: z.string().min(1, "La fecha de regreso es requerida"),
    horaRegreso: z.string().min(1, "La hora de regreso es requerida"),
    encargadoNombre: z.string().min(1, "El nombre del encargado es requerido").max(100, "Máximo 100 caracteres"),
    encargadoApellido1: z.string().min(1, "El primer apellido es requerido").max(100, "Máximo 100 caracteres"),
    encargadoApellido2: z.string().max(100, "Máximo 100 caracteres").optional(),
});

export type salidaConFamiliarInput = z.infer<typeof schemaSalidaConFamiliar>;
