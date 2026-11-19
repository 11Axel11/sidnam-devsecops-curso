import z from "zod";
import { fechaClinicaSchema } from "@/components/app/clinico/fechaSchema";
import { ESTADOS_COGNITIVOS, esNivelDeterioro } from "../models/valoracionNutricional";

// Esquema de BORRADOR: formato y coherencia (contrato §2). Lo obligatorio para cerrar lo dicta el
// backend con `faltantes`; aquí no se replica. Es un espejo del contrato, no la única barrera.
const textoLargo = z.string().max(20000, "No puede superar los 20 000 caracteres");
const textoCorto = z.string().max(255, "No puede superar los 255 caracteres");

// `nivelAnterior`: el valor que ya traía el borrador (puede ser un texto histórico fuera de la lista): se
// admite mientras no se toque; cualquier otro valor debe ser de la lista cerrada.
export const crearValoracionNutricionalBorradorSchema = (nivelAnterior = "") => z
  .object({
    fecha: fechaClinicaSchema,
    problemaVisual: z.boolean(),
    problemaCavidadOral: z.boolean(),
    alergiaMedicamentos: z.boolean(),
    detalleAlergiaMedicamentos: textoLargo,
    datoFuncionalId: z.number().int().min(1).nullable(),
    estadoCognitivo: z.enum(ESTADOS_COGNITIVOS),
    nivelDeterioroCognitivo: textoCorto,
    depresion: z.boolean(),
    ansiedad: z.boolean(),
  })
  .superRefine((v, ctx) => {
    const sinTexto = (s: string) => s.trim() === "";
    if (!v.alergiaMedicamentos && !sinTexto(v.detalleAlergiaMedicamentos)) {
      ctx.addIssue({ code: "custom", path: ["detalleAlergiaMedicamentos"], message: "Solo aplica si hay alergia a medicamentos" });
    }
    const nivel = v.nivelDeterioroCognitivo;
    if (!sinTexto(nivel) && !esNivelDeterioro(nivel) && nivel !== nivelAnterior) {
      ctx.addIssue({ code: "custom", path: ["nivelDeterioroCognitivo"], message: "Elige Leve, Moderado o Severo" });
    }
    if (v.estadoCognitivo === "normal" && !sinTexto(v.nivelDeterioroCognitivo)) {
      ctx.addIssue({ code: "custom", path: ["nivelDeterioroCognitivo"], message: "Solo aplica si hay deterioro cognitivo" });
    }
  });
