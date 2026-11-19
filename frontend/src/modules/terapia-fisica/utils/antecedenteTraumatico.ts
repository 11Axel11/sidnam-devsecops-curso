import { traducirFormatoComun } from "@/components/app/clinico/erroresFormato";
import type { AntecedenteTraumaticoPayload, AntecedenteTraumaticoValoracion } from "../models/valoracion";

export interface ValoresAntecedenteTraumatico {
  tipoId: number; // 0 = sin elegir
  descripcion: string;
  localizacionAnatomica: string;
  tiempoTranscurrido: string;
}

export const valoresVaciosTraumatico = (): ValoresAntecedenteTraumatico => ({
  tipoId: 0, descripcion: "", localizacionAnatomica: "", tiempoTranscurrido: "",
});

export const valoresDesdeTraumatico = (r: AntecedenteTraumaticoValoracion): ValoresAntecedenteTraumatico => ({
  tipoId: r.tipoId,
  descripcion: r.descripcion ?? "",
  localizacionAnatomica: r.localizacionAnatomica ?? "",
  tiempoTranscurrido: r.tiempoTranscurrido ?? "",
});

const texto = (s: string) => s.trim() || null;
const CAMPOS_TEXTO = ["descripcion", "localizacionAnatomica", "tiempoTranscurrido"] as const;

// POST: solo lo que tiene valor.
export function payloadCrearTraumatico(v: ValoresAntecedenteTraumatico): AntecedenteTraumaticoPayload {
  const body: AntecedenteTraumaticoPayload = { tipoId: v.tipoId };
  for (const c of CAMPOS_TEXTO) {
    const t = texto(v[c]);
    if (t !== null) body[c] = t;
  }
  return body;
}

// PATCH: solo lo que cambió; `null` limpia un texto. `tipoId` nunca se envía vacío.
export function payloadActualizarTraumatico(
  v: ValoresAntecedenteTraumatico, base: AntecedenteTraumaticoValoracion,
): AntecedenteTraumaticoPayload {
  const body: AntecedenteTraumaticoPayload = {};
  if (v.tipoId !== base.tipoId) body.tipoId = v.tipoId;
  for (const c of CAMPOS_TEXTO) {
    const nuevo = texto(v[c]);
    if (nuevo !== texto(base[c] ?? "")) body[c] = nuevo;
  }
  return body;
}

// Los 400 de formato llegan en inglés (class-validator): se traducen por campo.
export function traducirFormatoTraumatico(campo: string, msg: string): string {
  const comun = traducirFormatoComun(msg);
  if (comun) return comun;
  if (campo === "tipoId") return "Selecciona el tipo de antecedente";
  return msg;
}

export const CAMPOS_TRAUMATICO = ["tipoId", "descripcion", "localizacionAnatomica", "tiempoTranscurrido"] as const;
