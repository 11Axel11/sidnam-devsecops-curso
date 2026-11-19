import { interpretarTinetti } from 'src/common/utils/interpretarTinetti';
import { sumarItems } from 'src/common/valoraciones/instrumento';
import { ITEMS_EQUILIBRIO_TINETTI_V1, ITEMS_MARCHA_TINETTI_V1, ItemsTinetti } from './tinetti-v1.instrumento';

export interface ResultadoTinetti {
  /** Suma de la Parte I (máx. 16). */
  puntajeEquilibrio: number;
  /** Suma de la Parte II (máx. 12). */
  puntajeMarcha: number;
  /** Equilibrio + marcha (máx. 28). */
  puntajeTotal: number;
  riesgoCaida: string;
}

/**
 * Escala de Tinetti (RF-TF-09, RN-06): total de equilibrio (10 ítems, máx. 16), total de marcha (10 ítems,
 * máx. 12) y total general (máx. 28), más el riesgo de caída según la tabla confirmada el 28/09/2026
 * (docs/CLAUDE.md, decisión P6). Se calcula SOLO en el backend, se almacena con `versionInstrumento`
 * «Tinetti-v1» y no se recalcula (RN-04/09/10). Función pura, sin base de datos.
 *
 * | Total | riesgoCaida |
 * |---|---|
 * | < 19 | Riesgo alto de caídas |
 * | 19–23 | Riesgo de caídas |
 * | 24–28 | Riesgo bajo o leve |
 *
 * La tabla vive en `interpretarTinetti` (src/common/utils), que se reutiliza.
 *
 * @throws RangeError si un ítem falta o trae un valor que no es una opción del instrumento
 */
export function calcularTinetti(items: ItemsTinetti): ResultadoTinetti {
  const puntajeEquilibrio = sumarItems(ITEMS_EQUILIBRIO_TINETTI_V1, items);
  const puntajeMarcha = sumarItems(ITEMS_MARCHA_TINETTI_V1, items);
  const puntajeTotal = puntajeEquilibrio + puntajeMarcha;
  return { puntajeEquilibrio, puntajeMarcha, puntajeTotal, riesgoCaida: interpretarTinetti(puntajeTotal) };
}
