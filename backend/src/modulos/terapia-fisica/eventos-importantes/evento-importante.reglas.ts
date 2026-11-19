import { errorDeFechaHora } from 'src/common/valoraciones/fecha.helper';
import { errorDescripcionSiOtro } from 'src/common/valoraciones/tipo-otro.helper';
import { TIPO_EVENTO_IMPORTANTE_OTRO } from 'src/modulos/catalogos/seed/catalogos-iniciales';

/**
 * Reglas puras del evento importante (RF-TF-07), sin base de datos para poder probarlas en aislamiento.
 */

export interface TipoEventoResuelto {
  id: number;
  nombre: string;
  /** Estado ACTUAL del tipo en el catálogo. */
  activo: boolean;
}

export interface EntradaDeEvento {
  /** Ya convertida (`null` = no se pudo interpretar). */
  fechaHora: Date | null;
  tipoEventoId: number;
  /** Ítem del catálogo, o `null` si no existe. */
  tipo: TipoEventoResuelto | null;
  descripcion: string | null | undefined;
}

/**
 * Todos los problemas de un evento a registrar (el servicio los junta en un único `400 { errores }`):
 *  - la fecha-hora debe ser válida y no futura (tolerancia de reloj);
 *  - el tipo debe existir y estar ACTIVO (al registrar siempre; no hay edición);
 *  - con el tipo «Otro» la descripción es obligatoria (RF-TF-07).
 */
export function erroresDeEvento(entrada: EntradaDeEvento, ahora: Date): string[] {
  const errores: string[] = [];
  const errorFecha = errorDeFechaHora(entrada.fechaHora, ahora, 'del evento');
  if (errorFecha) errores.push(errorFecha);

  const { tipo, tipoEventoId } = entrada;
  if (!tipo) {
    errores.push(`tipoEventoId ${tipoEventoId} no existe en el catálogo`);
  } else if (!tipo.activo) {
    errores.push(`tipoEventoId ${tipoEventoId} ("${tipo.nombre}") está desactivado`);
  } else {
    const errorDescripcion = errorDescripcionSiOtro(tipo.nombre, entrada.descripcion, TIPO_EVENTO_IMPORTANTE_OTRO);
    if (errorDescripcion) errores.push(errorDescripcion);
  }
  return errores;
}
