import z from "zod";
import { crearFechaClinicaSchema } from "@/components/app/clinico/fechaSchema";
import { esFechaHoraFutura, HORA_VALIDA } from "../utils/horaCostaRica";

// Espejo del contrato de eventos (§1.1–§1.2), no la única barrera: el backend valida igualmente.
// `esOtro` indica que el tipo elegido es «Otro» (ver `esTipoOtro`): ahí la descripción es obligatoria.
export const crearEventoSchema = (esOtro: boolean) =>
  z
    .object({
      fecha: crearFechaClinicaSchema("del evento"),
      hora: z.string().regex(HORA_VALIDA, "Ingresa una hora válida (HH:mm)"),
      tipoEventoId: z.number({ message: "Selecciona el tipo de evento" }).int().min(1, "Selecciona el tipo de evento"),
      descripcion: z.string().max(20000, "No puede superar los 20 000 caracteres"),
    })
    .superRefine((v, ctx) => {
      if (esOtro && v.descripcion.trim() === "") {
        ctx.addIssue({
          code: "custom",
          path: ["descripcion"],
          message: "La descripción es obligatoria cuando el tipo es «Otro»",
        });
      }
      // Solo si la fecha y la hora son válidas por separado (si no, ya tienen su propio mensaje).
      if (
        /^\d{4}-\d{2}-\d{2}$/.test(v.fecha) && HORA_VALIDA.test(v.hora) && esFechaHoraFutura(v.fecha, v.hora)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["hora"],
          message: "La fecha y hora del evento no pueden ser posteriores a la fecha y hora actual",
        });
      }
    });
