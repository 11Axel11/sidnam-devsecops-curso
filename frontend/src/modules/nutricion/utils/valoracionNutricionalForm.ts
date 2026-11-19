import { hoyCostaRica } from "@/components/app/clinico/fechaClinica";
import type {
  EstadoCognitivo, ValoracionNutricional, ValoracionNutricionalPayload,
} from "../models/valoracionNutricional";

// Estado del formulario: textos como string ("" = vacío), booleanos siempre true/false (nunca null)
// y `datoFuncionalId` null = sin elegir.
export interface ValoresValoracionNutricional {
  fecha: string;
  problemaVisual: boolean;
  problemaCavidadOral: boolean;
  alergiaMedicamentos: boolean;
  detalleAlergiaMedicamentos: string;
  datoFuncionalId: number | null;
  estadoCognitivo: EstadoCognitivo;
  nivelDeterioroCognitivo: string;
  depresion: boolean;
  ansiedad: boolean;
}

// Mismos valores por defecto que aplica el backend al crear (contrato §1).
export const valoresIniciales = (): ValoresValoracionNutricional => ({
  fecha: hoyCostaRica(),
  problemaVisual: false,
  problemaCavidadOral: false,
  alergiaMedicamentos: false,
  detalleAlergiaMedicamentos: "",
  datoFuncionalId: null,
  estadoCognitivo: "normal",
  nivelDeterioroCognitivo: "",
  depresion: false,
  ansiedad: false,
});

export const valoresDesde = (v: ValoracionNutricional): ValoresValoracionNutricional => ({
  fecha: v.fecha,
  problemaVisual: v.problemaVisual,
  problemaCavidadOral: v.problemaCavidadOral,
  alergiaMedicamentos: v.alergiaMedicamentos,
  detalleAlergiaMedicamentos: v.detalleAlergiaMedicamentos ?? "",
  datoFuncionalId: v.datoFuncionalId,
  estadoCognitivo: v.estadoCognitivo,
  nivelDeterioroCognitivo: v.nivelDeterioroCognitivo ?? "",
  depresion: v.depresion,
  ansiedad: v.ansiedad,
});

// Aplica un cambio y limpia los dependientes en el mismo paso: el backend rechaza combinaciones
// contradictorias y no los limpia solo (contrato §2.1).
export function aplicarCambio(
  actual: ValoresValoracionNutricional, parche: Partial<ValoresValoracionNutricional>,
): ValoresValoracionNutricional {
  const v = { ...actual, ...parche };
  if (!v.alergiaMedicamentos) v.detalleAlergiaMedicamentos = "";
  if (v.estadoCognitivo === "normal") v.nivelDeterioroCognitivo = "";
  return v;
}

const texto = (s: string) => s.trim() || null;

const CAMPOS_BOOLEANOS = ["problemaVisual", "problemaCavidadOral", "alergiaMedicamentos", "depresion", "ansiedad"] as const;
const CAMPOS_TEXTO = ["detalleAlergiaMedicamentos", "nivelDeterioroCognitivo"] as const;

// POST: solo lo que tiene valor; booleanos y estado cognitivo siempre van (nunca null).
export function construirPayloadCrear(v: ValoresValoracionNutricional): ValoracionNutricionalPayload {
  const body: ValoracionNutricionalPayload = { fecha: v.fecha, estadoCognitivo: v.estadoCognitivo };
  for (const c of CAMPOS_BOOLEANOS) body[c] = v[c];
  for (const c of CAMPOS_TEXTO) {
    const t = texto(v[c]);
    if (t !== null) body[c] = t;
  }
  if (v.datoFuncionalId !== null) body.datoFuncionalId = v.datoFuncionalId;
  return body;
}

// PATCH: solo lo que cambió respecto a lo guardado. El interruptor y su dependiente viajan en la
// misma petición (`aplicarCambio` ya dejó el dependiente vacío → `null`). Un PATCH vacío igual sella
// modificadoPorId, por eso el llamador no debe enviarlo si el resultado no tiene claves.
export function construirPayloadActualizar(
  v: ValoresValoracionNutricional, base: ValoracionNutricional,
): ValoracionNutricionalPayload {
  const body: ValoracionNutricionalPayload = {};
  if (v.fecha !== base.fecha) body.fecha = v.fecha;
  if (v.estadoCognitivo !== base.estadoCognitivo) body.estadoCognitivo = v.estadoCognitivo;
  for (const c of CAMPOS_BOOLEANOS) if (v[c] !== base[c]) body[c] = v[c];
  for (const c of CAMPOS_TEXTO) {
    const nuevo = texto(v[c]);
    if (nuevo !== texto(base[c] ?? "")) body[c] = nuevo;
  }
  // Solo si cambió: un ítem desactivado después de asignarse no se rechaza mientras no se reenvíe otro.
  if (v.datoFuncionalId !== base.datoFuncionalId) body.datoFuncionalId = v.datoFuncionalId;
  return body;
}
