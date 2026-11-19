import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, EntityTarget, FindOptionsSelect, FindOptionsWhere, Not } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { Auditable } from 'src/common/auditoria/auditable.entity';
import { aplicarAuditoriaModificacion } from 'src/common/auditoria/auditoria.helper';
import { EstadoValoracion } from 'src/common/enums/estadoValoracion.enum';
import {
  bloquearValoracion,
  exigirEditable,
  exigirExpedienteEscribible,
  ValoracionConEstado,
} from './valoracion-lock.helper';

/**
 * Transición `borrador → vigente` de una valoración versionada (RN-03), común a
 * `valoracion_fisioterapeutica` y `valoracion_nutricional`.
 *
 * INVARIANTE: a lo sumo UNA valoración `vigente` NO anulada por expediente. No
 * puede expresarse como UNIQUE de SQL sobre un valor de enum condicional, así
 * que se garantiza con exclusión mutua: toda confirmación toma un bloqueo de
 * fila (`FOR UPDATE`) sobre el expediente, de modo que dos confirmaciones
 * simultáneas del mismo expediente se serializan; la segunda ve a la primera ya
 * confirmada (READ COMMITTED lee lo último confirmado) y la desplaza.
 *
 * Orden de candados (evita deadlocks): expediente → valoración.
 */

/** Lo que devuelve la validación propia de cada valoración. `faltantes` vacío = completa. */
export interface ResultadoValidacion {
  faltantes: string[];
  /** Campos extra del cuerpo del 400 (p. ej. `antecedentesPersonalesPendientes` en Terapia Física). */
  extras?: Record<string, unknown>;
}

export type ValoracionConfirmable = ValoracionConEstado & Auditable;

export interface OpcionesConfirmar<T extends ValoracionConfirmable> {
  entidad: EntityTarget<T>;
  id: number;
  usuarioId: number;
  /** Nombre legible para los 404 («Valoración fisioterapéutica 7 no existe»). */
  etiqueta: string;
  /**
   * Validación propia de cada valoración. Se ejecuta con los candados del expediente y de la
   * valoración YA tomados, así que cualquier lectura que haga (hijos, catálogos) ve el estado
   * definitivo: una escritura simultánea se serializó antes o recibirá 409 después.
   */
  validar: (m: EntityManager, v: T) => Promise<ResultadoValidacion>;
}

export const MENSAJE_FALTANTES_CONFIRMAR = 'Faltan campos obligatorios para confirmar la valoración';

export async function confirmarValoracion<T extends ValoracionConfirmable>(
  dataSource: DataSource,
  opciones: OpcionesConfirmar<T>,
): Promise<T> {
  const { entidad, id, usuarioId, etiqueta, validar } = opciones;

  return dataSource.transaction('READ COMMITTED', async (m) => {
    const repo = m.getRepository(entidad);

    // 1) Conocer el expediente (lectura simple) y 2) bloquearlo: serializa las confirmaciones.
    const previa = await repo.findOne({
      where: { id } as FindOptionsWhere<T>,
      select: { id: true, expedienteId: true } as FindOptionsSelect<T>,
    });
    if (!previa) throw new NotFoundException(`${etiqueta} ${id} no existe`);
    await exigirExpedienteEscribible(m, previa.expedienteId, true); // 404, o 409 EXPEDIENTE_INACTIVO (confirmar cambia la vigente)

    // 3) Con el candado tomado, re-leer la valoración (otra transacción pudo cambiarla mientras esperábamos).
    const v = await bloquearValoracion(m, entidad, id, etiqueta);
    exigirEditable(v, 'confirmar');

    // 4) Validación propia. Se lanza antes de modificar nada: la transacción hace rollback.
    const { faltantes, extras } = await validar(m, v);
    if (faltantes.length) {
      throw new BadRequestException({ message: MENSAJE_FALTANTES_CONFIRMAR, faltantes, ...extras });
    }

    // 5) La vigente anterior (no anulada) pasa a reemplazada, en la misma transacción.
    await repo.update(
      { expedienteId: v.expedienteId, estado: EstadoValoracion.VIGENTE, anulado: false, id: Not(id) } as FindOptionsWhere<T>,
      // update() no pasa por los hooks de Auditable: la marca se estampa a mano (hora de Node, no de MySQL).
      {
        estado: EstadoValoracion.REEMPLAZADA,
        modificadoPorId: usuarioId,
        fechaModificacion: new Date(),
      } as unknown as QueryDeepPartialEntity<T>,
    );

    // 6) La nueva queda vigente.
    v.estado = EstadoValoracion.VIGENTE;
    aplicarAuditoriaModificacion(v, usuarioId);
    return repo.save(v);
  });
}
