/**
 * Forma común de la tabla de un instrumento clínico versionado (RN-09): ítems con sus opciones discretas y
 * los puntos de cada una. Barthel-v1 y Tinetti-v1 (y más adelante MNA) declaran su tabla UNA vez, con las
 * etiquetas EXACTAS del anexo del documento de requerimientos; de esa constante salen el DTO (valores
 * permitidos), la calculadora y el contrato para el frontend. Los ítems, sus opciones y sus puntuaciones se
 * administran versionados en código, no como catálogo editable (Anexo A.3).
 */

export interface OpcionDeItem {
  puntos: number;
  /** Texto exacto del anexo. */
  etiqueta: string;
}

export interface ItemDeInstrumento {
  /** Nombre de la propiedad en el DTO y la entidad. */
  campo: string;
  /** Nombre del ítem tal como lo muestra el anexo (sin la numeración). */
  nombre: string;
  opciones: readonly OpcionDeItem[];
}

/** Puntos permitidos de un ítem, en el orden del anexo. */
export function puntosPermitidos(item: ItemDeInstrumento): number[] {
  return item.opciones.map((o) => o.puntos);
}

/** Mayor puntuación posible de un ítem. */
export function maximoDeItem(item: ItemDeInstrumento): number {
  return Math.max(...puntosPermitidos(item));
}

/** Suma de los máximos de una lista de ítems. */
export function maximoDeItems(items: readonly ItemDeInstrumento[]): number {
  return items.reduce((suma, item) => suma + maximoDeItem(item), 0);
}

/**
 * Suma los puntos de `items` en `respuestas`. Lanza `RangeError` si falta un ítem o trae un valor que no
 * está entre los permitidos (defensa de la calculadora: el DTO ya lo impide en la API).
 */
export function sumarItems(items: readonly ItemDeInstrumento[], respuestas: Readonly<Record<string, number>>): number {
  let total = 0;
  for (const item of items) {
    const valor = respuestas[item.campo];
    if (!puntosPermitidos(item).includes(valor)) {
      throw new RangeError(`${item.campo}: ${String(valor)} no es un valor permitido (${puntosPermitidos(item).join(', ')})`);
    }
    total += valor;
  }
  return total;
}
