import z from "zod";
import { yyyyMmDd, montoFacturaSchema, conFechaPagoValida } from "@/schemas/shared/factura";

export const areaSchema = z.object({
    nombre: z.string().min(1, "El nombre del área es obligatorio")
    .max(25, "El nombre del área no puede tener más de 25 caracteres"),
});

export type areaFormValues = z.infer<typeof areaSchema>;


export const crearProveedorSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio")
    .max(50, "El nombre de proveedor no puede tener más de 50 caracteres"),
  numero_proveedor: z
    .string()
    .trim()
    .min(1, "El número de proveedor es obligatorio")
    .max(20, "El número de proveedor no puede tener más de 20 caracteres"),
  email: z.string().trim().email("Email no válido"),
  direccion: z.string().trim().min(5, "La dirección debe tener más de 5 caracteres")
    .max(100, "La dirección no puede tener más de 100 caracteres"),
  id_area: z.coerce.number().int().positive("Área inválida"),
});

export type crearProveedorInput = z.infer<typeof crearProveedorSchema>;

const numeroFacturaSchema = z
  .string()
  .trim()
  .min(1, "El número de factura es obligatorio")
  .max(15, "El número de factura no puede tener más de 15 caracteres")
  .regex(/^\d+$/, "Solo dígitos numéricos")
  .transform((s) => Number(s));

export const crearFacturaSchema = conFechaPagoValida(
  z.object({
    sede: z.enum(["hogar", "cecuidam"], { message: "Seleccione una sede" }),
    proveedor_id: z.coerce.number().int().positive("Proveedor inválido"),
    numero_factura: numeroFacturaSchema,
    fecha_emision: yyyyMmDd,
    fecha_pago: yyyyMmDd,
    monto: montoFacturaSchema,
  }),
  "fecha_emision",
  "fecha_pago"
);

export type crearFacturaInput = z.infer<typeof crearFacturaSchema>;


export const editarFacturaSchema = conFechaPagoValida(
  z.object({
    numero_factura: numeroFacturaSchema,
    fecha_emitida: yyyyMmDd,
    fecha_pago: yyyyMmDd,
    monto: montoFacturaSchema,
  }),
  "fecha_emitida",
  "fecha_pago"
);

export type EditFacturaSchema = z.infer<typeof editarFacturaSchema>;

export const editarProveedorSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio")
    .max(50, "El nombre de proveedor no puede tener más de 50 caracteres"),
  numero_proveedor: z
    .string()
    .trim()
    .min(1, "El número de proveedor es obligatorio")
    .max(20, "El número de proveedor no puede tener más de 20 caracteres"),
  email: z.string().trim().email("Email no válido"),
  direccion: z.string().trim().min(5, "La direccion del proveedor es obligatoria")
    .max(50, "El número de proveedor no puede tener más de 50 caracteres"),
})
