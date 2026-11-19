import { redondearUnDecimal } from './calcular-imc';

/**
 * Reglas puras del control nutricional (RF-NU-01 / RF-NU-02), sin base de datos para poder probarlas en
 * aislamiento.
 */

/** Las medidas se capturan con a lo sumo 1 decimal (balanza/cinta/dinamómetro): lo guardado = lo digitado. */
export const MAX_DECIMALES_MEDIDA = 1;

/**
 * Rangos razonables para una PERSONA ADULTA MAYOR (anti-error de digitación, RF-NU-01). El documento solo
 * pide «rangos razonables»: estos límites son propuestos, amplios a propósito (incluyen desnutrición y
 * obesidad severas) y se ajustan aquí, en un único lugar. Límites inclusivos.
 */
export const RANGOS_CONTROL = {
  peso: { min: 20, max: 250, unidad: 'kg' },
  talla: { min: 100, max: 220, unidad: 'cm' },
  /** CB — circunferencia braquial (brazo). */
  circunferenciaBraquial: { min: 10, max: 60, unidad: 'cm' },
  /** CP — circunferencia de la pantorrilla. */
  circunferenciaPantorrilla: { min: 15, max: 70, unidad: 'cm' },
  /** AR — altura de la rodilla. */
  alturaRodilla: { min: 30, max: 70, unidad: 'cm' },
  /** FM — fuerza muscular (P4: kgf). 0 es válido: el residente no logró ejercer fuerza. */
  fuerzaMuscular: { min: 0, max: 100, unidad: 'kgf' },
} as const;

export interface PuntoDeSerie {
  id: number;
  /** 'YYYY-MM-DD' */
  fecha: string;
  peso: number;
  imc: number;
  anulado: boolean;
}

export interface Variacion {
  variacionPeso: number | null;
  variacionImc: number | null;
}

/**
 * Variación del peso y del IMC de cada control respecto del control NO ANULADO inmediatamente anterior
 * (RF-NU-02 / CA-15). La serie se ordena por (fecha, id): dos controles del mismo día se ordenan por
 * orden de registro. Es una PROYECCIÓN al leer (resta de los valores ya almacenados, 1 decimal): no se
 * guarda, porque depende del vecino y cambia si el anterior se anula. El primero de la serie y los
 * controles anulados no tienen variación (`null`).
 *
 * Pásele la serie COMPLETA del expediente (antes de filtrar por fechas): la primera fila de un rango se
 * compara con el control previo real, aunque quede fuera del rango.
 */
export function calcularVariaciones(serie: PuntoDeSerie[]): Map<number, Variacion> {
  const ordenada = [...serie].sort((a, b) => (a.fecha === b.fecha ? a.id - b.id : a.fecha < b.fecha ? -1 : 1));
  const resultado = new Map<number, Variacion>();
  let anterior: PuntoDeSerie | null = null;
  for (const punto of ordenada) {
    if (punto.anulado) {
      resultado.set(punto.id, { variacionPeso: null, variacionImc: null });
      continue;
    }
    resultado.set(
      punto.id,
      anterior
        ? {
            variacionPeso: redondearUnDecimal(punto.peso - anterior.peso),
            variacionImc: redondearUnDecimal(punto.imc - anterior.imc),
          }
        : { variacionPeso: null, variacionImc: null },
    );
    anterior = punto;
  }
  return resultado;
}
