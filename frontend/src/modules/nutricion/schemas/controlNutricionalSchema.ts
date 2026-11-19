import z from "zod";
import { crearFechaClinicaSchema } from "@/components/app/clinico/fechaSchema";
import {
  CAMPOS_MEDIDA, evaluarMedida, MEDIDAS_OBLIGATORIAS, RANGOS_CONTROL,
} from "../utils/controlNutricionalForm";

// Esquema del formulario de un control nuevo (contrato §1–§2). Trabaja sobre el texto digitado:
// peso y talla obligatorios, medidas con rango y máximo 1 decimal, interpretación ≤ 20 000.
// Espejo del contrato, no la única barrera: el backend valida igualmente.
export const controlNutricionalSchema = z
  .object({
    fecha: crearFechaClinicaSchema("del control"),
    peso: z.string(),
    talla: z.string(),
    circunferenciaBraquial: z.string(),
    circunferenciaPantorrilla: z.string(),
    alturaRodilla: z.string(),
    fuerzaMuscular: z.string(),
    interpretacion: z.string().max(20000, "No puede superar los 20 000 caracteres"),
  })
  .superRefine((v, ctx) => {
    for (const campo of CAMPOS_MEDIDA) {
      const r = RANGOS_CONTROL[campo];
      const m = evaluarMedida(v[campo]);
      const error = (message: string) => ctx.addIssue({ code: "custom", path: [campo], message });

      if (m.tipo === "vacio") {
        if (MEDIDAS_OBLIGATORIAS.includes(campo)) error(`${r.etiqueta} es obligatori${campo === "peso" ? "o" : "a"}`);
      } else if (m.tipo === "formato") {
        error("Ingresa un número, por ejemplo 58,4");
      } else if (m.valor < r.min || m.valor > r.max) {
        error(`${r.etiqueta} debe estar entre ${r.min} y ${r.max} ${r.unidad}${campo === "talla" ? " (se registra en centímetros, no en metros)" : ""}`);
      } else if (m.decimalesDeMas) {
        error("Máximo 1 decimal");
      }
    }
  });
