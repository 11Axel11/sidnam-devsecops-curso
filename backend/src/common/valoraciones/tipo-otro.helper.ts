/**
 * Regla «tipo Otro ⇒ descripción obligatoria» de los catálogos del Bloque B (antecedentes traumáticos,
 * RF-TF-03; eventos importantes, RF-TF-07). El tipo «Otro» se identifica SOLO por la constante de su
 * catálogo (`catalogos/seed/catalogos-iniciales.ts`), comparada sin mayúsculas ni espacios; si algún día
 * se renombrara ese ítem habría que migrar a una bandera en el catálogo. Funciones puras.
 */

/** ¿Es el ítem «Otro» de su catálogo? `nombreOtro` es la constante de ese catálogo. */
export function esTipoOtro(nombreTipo: string, nombreOtro: string): boolean {
  return nombreTipo.trim().toLowerCase() === nombreOtro.toLowerCase();
}

/** La descripción es obligatoria cuando el tipo es «Otro». Devuelve el error o null. */
export function errorDescripcionSiOtro(
  nombreTipo: string,
  descripcion: string | null | undefined,
  nombreOtro: string,
): string | null {
  if (!esTipoOtro(nombreTipo, nombreOtro)) return null;
  const hayDescripcion = typeof descripcion === 'string' && descripcion.trim().length > 0;
  return hayDescripcion ? null : `descripcion es obligatoria cuando el tipo es "${nombreOtro}"`;
}
