import { sumarItems } from 'src/common/valoraciones/instrumento';
import {
  CampoCribaje,
  CampoEvaluacion,
  CAMPOS_EVALUACION,
  ITEMS_CRIBAJE_MNA_V1,
  ITEMS_EVALUACION_MNA_V1,
} from './mna-v1.instrumento';

/** Subtotal de cribaje a partir del cual la segunda parte «no es necesaria» (RN-07, Tabla 27). */
export const CRIBAJE_SEGUNDA_PARTE_NO_NECESARIA = 12;

/** Interpretación parcial del cribaje (Tabla 27): texto EXACTO del anexo. */
export const INTERPRETACION_CRIBAJE = {
  normal: 'Estado nutricional normal. No es necesario continuar la evaluación.',
  riesgo: 'Riesgo de malnutrición. Continuar la evaluación.',
  malnutricion: 'Malnutrición. Continuar la evaluación.',
} as const;

/** Interpretación de la evaluación global (Tabla 30): texto EXACTO del anexo. */
export const INTERPRETACION_GLOBAL = {
  normal: 'Estado nutricional normal',
  riesgo: 'Riesgo de malnutrición',
  malnutricion: 'Malnutrición',
} as const;

/** Tabla 27: 12–14 normal · 8–11 riesgo · 0–7 malnutrición. */
export function interpretarCribaje(subtotalCribaje: number): string {
  if (subtotalCribaje >= CRIBAJE_SEGUNDA_PARTE_NO_NECESARIA) return INTERPRETACION_CRIBAJE.normal;
  if (subtotalCribaje >= 8) return INTERPRETACION_CRIBAJE.riesgo;
  return INTERPRETACION_CRIBAJE.malnutricion;
}

/** Tabla 30: 24–30 normal · 17–23,5 riesgo · menos de 17 malnutrición. */
export function interpretarGlobal(evaluacionGlobal: number): string {
  if (evaluacionGlobal >= 24) return INTERPRETACION_GLOBAL.normal;
  if (evaluacionGlobal >= 17) return INTERPRETACION_GLOBAL.riesgo;
  return INTERPRETACION_GLOBAL.malnutricion;
}

/** Los seis ítems del cribaje (A–F) son siempre obligatorios; los doce de la evaluación (G–R) pueden faltar. */
export type ItemsMna = Record<CampoCribaje, number> & Partial<Record<CampoEvaluacion, number | null>>;

export interface ResultadoMna {
  /** Suma de A–F (máx. 14). */
  subtotalCribaje: number;
  /** Tabla 27, texto exacto. */
  interpretacionCribaje: string;
  /** Suma de G–R (máx. 16), o `null` si la segunda parte no se registró. */
  subtotalEvaluacion: number | null;
  /** Cribaje + evaluación (máx. 30), o `null` sin segunda parte. */
  evaluacionGlobal: number | null;
  /** Tabla 30, texto exacto, o `null` sin segunda parte. */
  interpretacionGlobal: string | null;
}

/**
 * Mini Nutritional Assessment (RF-NU-03, RN-07): subtotal de cribaje (A–F, máx. 14) con su interpretación parcial
 * y, si se registró la segunda parte, subtotal de evaluación (G–R, máx. 16), evaluación global (máx. 30) e
 * interpretación global. Se calcula SOLO en el backend, se almacena con `versionInstrumento` «MNA-v1» y no se
 * recalcula (RN-04/09/10). Función pura, sin base de datos. Las sumas con medios puntos (K, M, P, Q) son exactas.
 *
 * La segunda parte es todo o nada aquí: sin ningún ítem G–R los tres valores de evaluación son `null`; con los
 * doce se calculan; con una parte lanza `RangeError`. Si la segunda parte es obligatoria u opcional según el
 * cribaje lo decide `mna.reglas.ts`, no esta función.
 *
 * @throws RangeError si falta un ítem A–F, un valor no es una opción del instrumento, o G–R está incompleto
 */
export function calcularMna(items: ItemsMna): ResultadoMna {
  const subtotalCribaje = sumarItems(ITEMS_CRIBAJE_MNA_V1, items as unknown as Record<string, number>);
  const interpretacionCribaje = interpretarCribaje(subtotalCribaje);

  const presentes = CAMPOS_EVALUACION.filter((c) => items[c] !== undefined && items[c] !== null);
  if (presentes.length === 0) {
    return { subtotalCribaje, interpretacionCribaje, subtotalEvaluacion: null, evaluacionGlobal: null, interpretacionGlobal: null };
  }
  if (presentes.length !== CAMPOS_EVALUACION.length) {
    const faltan = CAMPOS_EVALUACION.filter((c) => !presentes.includes(c));
    throw new RangeError(`la segunda parte está incompleta: faltan ${faltan.join(', ')}`);
  }
  const subtotalEvaluacion = sumarItems(ITEMS_EVALUACION_MNA_V1, items as Record<string, number>);
  const evaluacionGlobal = subtotalCribaje + subtotalEvaluacion;
  return {
    subtotalCribaje,
    interpretacionCribaje,
    subtotalEvaluacion,
    evaluacionGlobal,
    interpretacionGlobal: interpretarGlobal(evaluacionGlobal),
  };
}
