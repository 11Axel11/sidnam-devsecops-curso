import { AplicacionTestMovimiento } from '../entities/aplicacion-test-movimiento.entity';
import { AplicacionTestMovimientoEjercicio } from '../entities/aplicacion-test-movimiento-ejercicio.entity';
import { EjercicioCatalogo } from './test-movimiento.reglas';

/**
 * Respuesta de las aplicaciones del test: la cabecera tal cual se guardó + sus ejercicios con el nombre
 * y el `activo` ACTUAL del ítem de catálogo (un ejercicio desactivado después sigue resolviéndose).
 * Los ejercicios van ordenados por `ejercicioId`, para alinear dos aplicaciones ejercicio por ejercicio.
 */
export interface EjercicioAplicadoDetalle {
  id: number;
  ejercicioId: number;
  ejercicio: EjercicioCatalogo;
  modalidad: string;
  modificacion: string | null;
  resultado: string;
}

export type AplicacionTestMovimientoDetalle = AplicacionTestMovimiento & { ejercicios: EjercicioAplicadoDetalle[] };

export function aEjercicioAplicado(f: AplicacionTestMovimientoEjercicio): EjercicioAplicadoDetalle {
  return {
    id: f.id,
    ejercicioId: f.ejercicioId,
    ejercicio: { id: f.ejercicio?.id ?? f.ejercicioId, nombre: f.ejercicio?.nombre ?? '', activo: f.ejercicio?.activo ?? false },
    modalidad: f.modalidad,
    modificacion: f.modificacion ?? null,
    resultado: f.resultado,
  };
}

export function aDetalleAplicacion(
  cabecera: AplicacionTestMovimiento,
  filas: AplicacionTestMovimientoEjercicio[],
): AplicacionTestMovimientoDetalle {
  return {
    ...cabecera,
    ejercicios: [...filas].sort((a, b) => a.ejercicioId - b.ejercicioId).map(aEjercicioAplicado),
  };
}
