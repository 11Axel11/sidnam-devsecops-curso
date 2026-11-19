import { CaracteristicaDolor } from '../enums/caracteristicaDolor.enum';
import { ValoracionFisioterapeutica } from '../entities/valoracion-fisioterapeutica.entity';

/**
 * Reglas puras de la valoración fisioterapéutica (sin base de datos), para
 * poder probarlas en aislamiento. Dos niveles, a propósito:
 *
 *  1. COHERENCIA (`validarCoherencia`): se aplica en cada escritura, también en
 *     borradores. Rechaza combinaciones contradictorias (p. ej. intensidad de
 *     dolor sin dolor). Permite guardado parcial (RNF-08).
 *  2. COMPLETITUD (`camposFaltantesParaConfirmar`): solo al confirmar. Decisión
 *     del 14/10/2026: se exige únicamente lo que la propia respuesta del
 *     profesional vuelve obligatorio (si hay dolor → zona e intensidad, etc.);
 *     el documento de requerimientos no declara más campos obligatorios y no
 *     se inventa obligatoriedad clínica. Para exigir más (p. ej. tratamiento),
 *     ampliar `camposFaltantesParaConfirmar`.
 */

type Datos = Partial<
  Pick<
    ValoracionFisioterapeutica,
    | 'fecha'
    | 'antecedentesCaidas'
    | 'detalleCaidas'
    | 'usoAyudasBiomecanicas'
    | 'detalleAyudasBiomecanicas'
    | 'presentaDolor'
    | 'zonaDolorosa'
    | 'caracteristicasDolor'
    | 'direccionIrradiacion'
    | 'intensidadDolor'
  >
>;

const hayTexto = (v: unknown): boolean => typeof v === 'string' && v.trim().length > 0;
const irradiado = (d: Datos): boolean => !!d.caracteristicasDolor?.includes(CaracteristicaDolor.IRRADIADO);

// La validación de fecha es común con Nutrición: vive en src/common/valoraciones/fecha.helper.ts.
// Se re-exporta para no cambiar a quienes ya la importan desde aquí.
export { errorDeFecha, esFechaValida } from 'src/common/valoraciones/fecha.helper';

/** Contradicciones internas del estado FINAL de la valoración (ya mezclado con el PATCH). */
export function validarCoherencia(d: Datos): string[] {
  const errores: string[] = [];

  if (!d.presentaDolor) {
    if (hayTexto(d.zonaDolorosa)) errores.push('zonaDolorosa solo aplica si presentaDolor es true');
    if (d.intensidadDolor !== null && d.intensidadDolor !== undefined) {
      errores.push('intensidadDolor solo aplica si presentaDolor es true');
    }
    if (d.caracteristicasDolor?.length) errores.push('caracteristicasDolor solo aplica si presentaDolor es true');
  }
  if (hayTexto(d.direccionIrradiacion) && !irradiado(d)) {
    errores.push('direccionIrradiacion solo aplica si caracteristicasDolor incluye "irradiado"');
  }
  if (!d.antecedentesCaidas && hayTexto(d.detalleCaidas)) {
    errores.push('detalleCaidas solo aplica si antecedentesCaidas es true');
  }
  if (!d.usoAyudasBiomecanicas && hayTexto(d.detalleAyudasBiomecanicas)) {
    errores.push('detalleAyudasBiomecanicas solo aplica si usoAyudasBiomecanicas es true');
  }
  if (d.caracteristicasDolor && new Set(d.caracteristicasDolor).size !== d.caracteristicasDolor.length) {
    errores.push('caracteristicasDolor no admite valores repetidos');
  }
  return errores;
}

/** Campos que faltan para poder CONFIRMAR (borrador → vigente). Vacío = completa. */
export function camposFaltantesParaConfirmar(d: Datos): string[] {
  const faltan: string[] = [];
  if (!hayTexto(d.fecha)) faltan.push('fecha');
  if (d.presentaDolor) {
    if (!hayTexto(d.zonaDolorosa)) faltan.push('zonaDolorosa');
    if (d.intensidadDolor === null || d.intensidadDolor === undefined) faltan.push('intensidadDolor');
  }
  if (d.antecedentesCaidas && !hayTexto(d.detalleCaidas)) faltan.push('detalleCaidas');
  if (d.usoAyudasBiomecanicas && !hayTexto(d.detalleAyudasBiomecanicas)) faltan.push('detalleAyudasBiomecanicas');
  if (irradiado(d) && !hayTexto(d.direccionIrradiacion)) faltan.push('direccionIrradiacion');
  return faltan;
}
