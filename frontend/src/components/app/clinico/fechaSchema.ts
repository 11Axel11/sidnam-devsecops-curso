import z from "zod";
import { hoyCostaRica } from "./fechaClinica";

const esFechaReal = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  const f = new Date(y, m - 1, d);
  return f.getFullYear() === y && f.getMonth() === m - 1 && f.getDate() === d;
};

// Fecha clínica: YYYY-MM-DD, fecha real y no posterior a hoy (hora de Costa Rica). `de` completa el
// texto de los mensajes: «La fecha <de> no es una fecha válida» (p. ej. «de la valoración», «del control»).
// Espejo de la regla del backend, no la única barrera.
export const crearFechaClinicaSchema = (de: string) =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe tener formato AAAA-MM-DD")
    .refine(esFechaReal, `La fecha ${de} no es una fecha válida`)
    .refine((f) => f <= hoyCostaRica(), `La fecha ${de} no puede ser posterior a hoy`);

// `fecha` de una valoración clínica (Terapia Física y Nutrición).
export const fechaClinicaSchema = crearFechaClinicaSchema("de la valoración");
