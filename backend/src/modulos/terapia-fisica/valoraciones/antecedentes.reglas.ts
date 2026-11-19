import { errorDescripcionSiOtro, esTipoOtro as esNombreOtro } from 'src/common/valoraciones/tipo-otro.helper';
import { TIPO_ANTECEDENTE_TRAUMATICO_OTRO } from 'src/modulos/catalogos/seed/catalogos-iniciales';

/**
 * Reglas puras de los antecedentes de la valoración fisioterapéutica
 * (RF-TF-02 / RF-TF-03), sin base de datos para poder probarlas en aislamiento.
 */

/** ¿Es el tipo «Otro»? Se compara por la constante del catálogo, sin mayúsculas ni espacios. */
export function esTipoOtro(nombreTipo: string): boolean {
  return esNombreOtro(nombreTipo, TIPO_ANTECEDENTE_TRAUMATICO_OTRO);
}

/** RF-TF-03: la descripción es obligatoria cuando el tipo es «Otro». Devuelve el error o null. */
export function errorDescripcionOtro(nombreTipo: string, descripcion: string | null | undefined): string | null {
  return errorDescripcionSiOtro(nombreTipo, descripcion, TIPO_ANTECEDENTE_TRAUMATICO_OTRO);
}

export interface ItemCatalogo {
  id: number;
  nombre: string;
}

/**
 * Ítems ACTIVOS del catálogo de antecedentes personales que todavía no tienen
 * fila en la valoración (ni presente ni descartado). Es lo que `confirmar`
 * exige completar (decisión BE-2b: RF-TF-02 pide registrar explícitamente que
 * cada antecedente fue evaluado). No asume ninguna cantidad de ítems: el
 * conjunto exigido son los activos AL CONFIRMAR. Un ítem desactivado antes de
 * evaluarse deja de exigirse; uno ya evaluado conserva su fila.
 */
export function antecedentesPersonalesPendientes(activos: ItemCatalogo[], idsEvaluados: number[]): ItemCatalogo[] {
  const evaluados = new Set(idsEvaluados);
  return activos.filter((a) => !evaluados.has(a.id));
}
