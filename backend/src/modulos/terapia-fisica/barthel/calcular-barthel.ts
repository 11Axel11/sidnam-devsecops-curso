import { sumarItems } from 'src/common/valoraciones/instrumento';
import { interpretarBarthel } from 'src/common/utils/interpretarBarthel';
import { DEAMBULAR_SILLA_DE_RUEDAS, ITEMS_BARTHEL_V1, ItemsBarthel } from './barthel-v1.instrumento';

/**
 * Índice de Barthel (RF-TF-08, RN-05): puntuación total = suma de los diez ítems (0–100) y grado de dependencia
 * según la tabla confirmada el 28/09/2026 (docs/CLAUDE.md). Se calcula SOLO en el backend, se almacena con
 * `versionInstrumento` «Barthel-v1» y no se recalcula (RN-04/09/10). Función pura, sin base de datos.
 *
 * | Total | gradoDependencia |
 * |---|---|
 * | 0–20 | Dependencia Total |
 * | 21–60 | Dependencia Severa |
 * | 61–90 | Dependencia Moderada |
 * | 91–99 | Dependencia Escasa |
 * | 100 | Independencia |
 * | 90 **y** `deambular = 5` | Independencia — uso de silla de ruedas (precedencia sobre 61–90) |
 *
 * La silla de ruedas no tiene columna propia: se deriva de `deambular = 5` («Independiente en silla de ruedas
 * sin ayuda»). La tabla vive en `interpretarBarthel` (src/common/utils), que se reutiliza.
 *
 * @throws RangeError si un ítem falta o trae un valor que no es una opción del instrumento
 */
export function calcularBarthel(items: ItemsBarthel): { puntajeTotal: number; gradoDependencia: string } {
  const puntajeTotal = sumarItems(ITEMS_BARTHEL_V1, items);
  const usaSillaDeRuedas = items.deambular === DEAMBULAR_SILLA_DE_RUEDAS;
  return { puntajeTotal, gradoDependencia: interpretarBarthel(puntajeTotal, usaSillaDeRuedas) };
}
