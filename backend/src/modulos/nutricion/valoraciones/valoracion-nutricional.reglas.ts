import { EstadoCognitivo } from '../enums/estado-cognitivo.enum';
import { ValoracionNutricional } from '../entities/valoracion-nutricional.entity';

/**
 * Reglas puras de la valoración nutricional (sin base de datos), para poder probarlas en aislamiento.
 * Dos niveles, igual que en Terapia Física:
 *
 *  1. COHERENCIA (`validarCoherencia`): en cada escritura, también en borradores. Rechaza
 *     combinaciones contradictorias sobre el ESTADO FINAL (ya mezclado con el PATCH).
 *  2. COMPLETITUD (`camposFaltantesParaConfirmar`): solo al confirmar. Decisión del 21/10/2026:
 *     lo que la propia respuesta vuelve obligatorio (detalle de alergia, nivel del deterioro) más
 *     `datoFuncionalId` (selección única de RF-NU-04 que alimenta la «condición de movilidad» de la
 *     ficha resumen, RF-TR-01). No se inventa más obligatoriedad clínica.
 */

type Datos = Partial<
  Pick<
    ValoracionNutricional,
    'fecha' | 'alergiaMedicamentos' | 'detalleAlergiaMedicamentos' | 'datoFuncionalId' | 'estadoCognitivo' | 'nivelDeterioroCognitivo'
  >
>;

const hayTexto = (v: unknown): boolean => typeof v === 'string' && v.trim().length > 0;

/** Sin estado cognitivo informado se asume el default de la columna (`normal`). */
const conDeterioro = (d: Datos): boolean => (d.estadoCognitivo ?? EstadoCognitivo.NORMAL) === EstadoCognitivo.CON_DETERIORO;

/** Contradicciones internas del estado FINAL de la valoración. */
export function validarCoherencia(d: Datos): string[] {
  const errores: string[] = [];
  if (!d.alergiaMedicamentos && hayTexto(d.detalleAlergiaMedicamentos)) {
    errores.push('detalleAlergiaMedicamentos solo aplica si alergiaMedicamentos es true');
  }
  if (!conDeterioro(d) && hayTexto(d.nivelDeterioroCognitivo)) {
    errores.push('nivelDeterioroCognitivo solo aplica si estadoCognitivo es con_deterioro');
  }
  return errores;
}

/** Campos que faltan para poder CONFIRMAR (borrador → vigente), en este orden. Vacío = completa. */
export function camposFaltantesParaConfirmar(d: Datos): string[] {
  const faltan: string[] = [];
  if (!hayTexto(d.fecha)) faltan.push('fecha');
  if (d.datoFuncionalId === null || d.datoFuncionalId === undefined) faltan.push('datoFuncionalId');
  if (d.alergiaMedicamentos && !hayTexto(d.detalleAlergiaMedicamentos)) faltan.push('detalleAlergiaMedicamentos');
  if (conDeterioro(d) && !hayTexto(d.nivelDeterioroCognitivo)) faltan.push('nivelDeterioroCognitivo');
  return faltan;
}
