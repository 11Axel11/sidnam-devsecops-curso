import { traducirFormatoComun } from "@/components/app/clinico/erroresFormato";
import { RANGOS_CONTROL, type CampoMedida } from "./controlNutricionalForm";

// Campos del DTO de la valoración nutricional (para mapear los 400 de formato por prefijo de campo).
export const CAMPOS_VALORACION_NUTRICIONAL = [
  "fecha", "problemaVisual", "problemaCavidadOral", "alergiaMedicamentos", "detalleAlergiaMedicamentos",
  "datoFuncionalId", "estadoCognitivo", "nivelDeterioroCognitivo", "depresion", "ansiedad",
] as const;

// Los 400 de formato llegan en inglés (class-validator): se traducen por campo (contrato §2.3).
export function traducirFormato(campo: string, msg: string): string {
  const comun = traducirFormatoComun(msg);
  if (comun) return comun;
  if (campo === "estadoCognitivo") return "Elige Normal o Con deterioro cognitivo";
  if (campo === "nivelDeterioroCognitivo") return "Elige Leve, Moderado o Severo";
  if (campo === "datoFuncionalId") return "Selecciona un dato funcional válido";
  return msg;
}

// ---- control nutricional ----
export const CAMPOS_CONTROL_NUTRICIONAL = [
  "fecha", "peso", "talla", "circunferenciaBraquial", "circunferenciaPantorrilla", "alturaRodilla",
  "fuerzaMuscular", "interpretacion",
] as const;

// Un `peso` mal tipado trae hasta tres mensajes; el llamador se queda con el primero por campo.
export function traducirFormatoControl(campo: string, msg: string): string {
  const comun = traducirFormatoComun(msg);
  if (comun) return comun;
  const rango = RANGOS_CONTROL[campo as CampoMedida];
  if (rango && /must not be (less|greater) than/.test(msg)) {
    return `${rango.etiqueta} debe estar entre ${rango.min} y ${rango.max} ${rango.unidad}`;
  }
  if (rango && /must be a number/.test(msg)) return "Ingresa un número, con máximo 1 decimal";
  return msg;
}
