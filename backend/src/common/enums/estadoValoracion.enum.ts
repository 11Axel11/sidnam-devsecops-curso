/**
 * Estado de las valoraciones versionadas (RN-03). Compartido por
 * `valoracion_fisioterapeutica` y `valoracion_nutricional`.
 *
 *  - borrador:    en elaboración; es lo único editable.
 *  - vigente:     la última confirmada; solo una (no anulada) por expediente.
 *  - reemplazada: confirmada y luego desplazada por una más reciente (historial).
 */
export enum EstadoValoracion {
  BORRADOR = 'borrador',
  VIGENTE = 'vigente',
  REEMPLAZADA = 'reemplazada',
}
