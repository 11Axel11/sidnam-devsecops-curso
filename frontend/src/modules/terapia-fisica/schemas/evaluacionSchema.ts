import z from "zod";
import { crearFechaClinicaSchema } from "@/components/app/clinico/fechaSchema";
import type { DefinicionInstrumento, ItemInstrumento } from "@/components/app/clinico/instrumento";
import type { PayloadEvaluacion } from "../models/evaluaciones";

// Estado del formulario de un instrumento: una opción (los `puntos`) por ítem o `null` si falta.
export interface ValoresEvaluacion {
  fecha: string;
  observaciones: string;
  items: Record<string, number | null>;
}

export const itemsDe = (def: DefinicionInstrumento): ItemInstrumento[] => def.secciones.flatMap((s) => [...s.items]);

// Esquema de un registro nuevo (no hay borrador): fecha válida y no futura, TODOS los ítems con una de
// sus opciones y observaciones ≤ 20 000. Sin esquema de resultado: el total, grado, riesgo, etc. son del
// backend. Es un espejo del contrato, no la única barrera.
export const crearEsquemaEvaluacion = (def: DefinicionInstrumento) =>
  z.object({
    fecha: crearFechaClinicaSchema("de la evaluación"),
    observaciones: z.string().max(20000, "No puede superar los 20 000 caracteres"),
    items: z.object(
      Object.fromEntries(
        itemsDe(def).map((item) => [
          item.campo,
          z.number().nullable().refine(
            (v) => v !== null && item.opciones.some((o) => o.puntos === v),
            "Selecciona una opción",
          ),
        ]),
      ),
    ),
  });

// POST: fecha, ítems (números JSON) y observaciones con valor. Nada calculado ni de auditoría.
export function construirPayloadEvaluacion(v: ValoresEvaluacion): PayloadEvaluacion {
  const body: PayloadEvaluacion = { fecha: v.fecha };
  for (const [campo, puntos] of Object.entries(v.items)) if (puntos !== null) body[campo] = puntos;
  const observaciones = v.observaciones.trim();
  if (observaciones) body.observaciones = observaciones;
  return body;
}

export const valoresInicialesEvaluacion = (def: DefinicionInstrumento, fecha: string): ValoresEvaluacion => ({
  fecha,
  observaciones: "",
  items: Object.fromEntries(itemsDe(def).map((i) => [i.campo, null])),
});
