import { EventoImportanteTf } from '../entities/evento-importante-tf.entity';
import { TipoEventoResuelto } from './evento-importante.reglas';

/**
 * Respuesta de los eventos importantes: el evento tal cual se guardó + el tipo resuelto con su `activo`
 * ACTUAL (un tipo desactivado después sigue resolviéndose en el historial). No se devuelve la entidad de
 * catálogo completa.
 */
export type EventoImportanteDetalle = Omit<EventoImportanteTf, 'tipoEvento'> & { tipoEvento: TipoEventoResuelto };

export function aDetalleEvento(e: EventoImportanteTf): EventoImportanteDetalle {
  const { tipoEvento, ...resto } = e;
  return {
    ...resto,
    tipoEvento: { id: tipoEvento?.id ?? e.tipoEventoId, nombre: tipoEvento?.nombre ?? '', activo: tipoEvento?.activo ?? false },
  };
}
