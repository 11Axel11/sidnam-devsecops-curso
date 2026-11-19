import { ConflictException, NotFoundException } from '@nestjs/common';
import { EntityManager, EntityTarget, FindOptionsWhere } from 'typeorm';
import { EstadoExpediente } from 'src/common/enums/estadosExpedientes.enum';
import { EstadoValoracion } from 'src/common/enums/estadoValoracion.enum';
import { Expediente_Residente } from 'src/modulos/residentes/entities/expedientes.entity';

/**
 * Candados compartidos de la máquina de estados de valoraciones (RN-03).
 * Los usan la valoración fisioterapéutica, sus registros hijos y, más
 * adelante, la valoración nutricional. Siempre se llaman DENTRO de una
 * transacción `READ COMMITTED`.
 *
 * Orden de candados (evita deadlocks): expediente → valoración. Las ediciones,
 * anulaciones y escrituras de hijos solo toman el de la valoración; solo
 * `confirmar` toma también el del expediente.
 */

/** Forma mínima que necesitan estos helpers de una valoración. */
export interface ValoracionConEstado {
  id: number;
  expedienteId: number;
  estado: EstadoValoracion;
  anulado: boolean;
}

/** Código estable del `409` por expediente inactivo: el frontend lo distingue de los demás `409` por este campo. */
export const CODIGO_EXPEDIENTE_INACTIVO = 'EXPEDIENTE_INACTIVO';

/**
 * `409` por escribir en un expediente `Inactivo` (decisión de la Jefatura, octubre 2026). Cuerpo estable:
 * `{ statusCode: 409, error: 'Conflict', codigo: 'EXPEDIENTE_INACTIVO', message, expedienteId }`.
 */
export class ExpedienteInactivoException extends ConflictException {
  constructor(expedienteId: number) {
    super({
      statusCode: 409,
      error: 'Conflict',
      codigo: CODIGO_EXPEDIENTE_INACTIVO,
      message:
        `El expediente ${expedienteId} está inactivo: no se pueden registrar ni modificar datos clínicos ` +
        '(las consultas y las anulaciones siguen disponibles). Reactive el expediente para continuar.',
      expedienteId,
    });
  }
}

/** Lee el expediente (solo PK y estado, sin joins); con `bloquear` toma FOR UPDATE. `null` si no existe. */
async function leerExpediente(m: EntityManager, expedienteId: number, bloquear: boolean): Promise<Expediente_Residente | null> {
  const qb = m
    .createQueryBuilder(Expediente_Residente, 'e')
    .select(['e.id_expediente', 'e.estado'])
    .where('e.id_expediente = :expedienteId', { expedienteId });
  if (bloquear) qb.setLock('pessimistic_write');
  return qb.getOne();
}

/**
 * RN-01: 404 si el expediente no existe. Con `bloquear` toma FOR UPDATE (solo la PK, sin joins).
 * Para LECTURAS (historial, series, vigente) y para vistas previas: no mira el estado del expediente, de modo que un
 * expediente inactivo sigue siendo consultable. Para ESCRIBIR use `exigirExpedienteEscribible`.
 */
export async function exigirExpediente(m: EntityManager, expedienteId: number, bloquear = false): Promise<void> {
  if (!(await leerExpediente(m, expedienteId, bloquear))) throw new NotFoundException(`Expediente ${expedienteId} no existe`);
}

/**
 * ÚNICO punto donde el Bloque B decide si un expediente admite escrituras: 404 si no existe y **409
 * `EXPEDIENTE_INACTIVO`** si está `Inactivo`. Se aplica a los registros NUEVOS y a los cambios de contenido clínico
 * (crear, editar un borrador, confirmar, antecedentes, etc.); NO a las anulaciones (permiten corregir errores), ni a las
 * lecturas, ni a las vistas previas.
 *
 * Sin candados nuevos: es una lectura simple (o la lectura bloqueada que el llamador ya hacía con `bloquear`), así se
 * respeta el orden de candados expediente → valoración. Límite conocido: una escritura que llegue en el mismo instante
 * en que alguien cierra el expediente puede colarse (ventana de milisegundos).
 */
export async function exigirExpedienteEscribible(m: EntityManager, expedienteId: number, bloquear = false): Promise<void> {
  const expediente = await leerExpediente(m, expedienteId, bloquear);
  if (!expediente) throw new NotFoundException(`Expediente ${expedienteId} no existe`);
  if (expediente.estado === EstadoExpediente.Inactivo) throw new ExpedienteInactivoException(expedienteId);
}

/** Lee la valoración con bloqueo de fila (FOR UPDATE) o 404. `etiqueta` solo da nombre al error. */
export async function bloquearValoracion<T extends ValoracionConEstado>(
  m: EntityManager,
  entidad: EntityTarget<T>,
  id: number,
  etiqueta: string,
): Promise<T> {
  const v = await m
    .getRepository(entidad)
    .findOne({ where: { id } as FindOptionsWhere<T>, lock: { mode: 'pessimistic_write' } });
  if (!v) throw new NotFoundException(`${etiqueta} ${id} no existe`);
  return v;
}

/**
 * Como `bloquearValoracion`, pero para ESCRIBIR contenido clínico (editar un borrador, antecedentes hijos): después de
 * bloquear la valoración exige que su expediente esté activo (409 `EXPEDIENTE_INACTIVO`). Orden de errores: 404 →
 * 409 inactivo → (el llamador) `exigirEditable`. Las anulaciones siguen usando `bloquearValoracion`.
 */
export async function bloquearValoracionEscribible<T extends ValoracionConEstado>(
  m: EntityManager,
  entidad: EntityTarget<T>,
  id: number,
  etiqueta: string,
): Promise<T> {
  const v = await bloquearValoracion(m, entidad, id, etiqueta);
  await exigirExpedienteEscribible(m, v.expedienteId);
  return v;
}

/** RN-02/RN-03: solo se edita/confirma (y se le escriben hijos a) un borrador no anulado; si no, 409. */
export function exigirEditable(v: Pick<ValoracionConEstado, 'estado' | 'anulado'>, accion = 'editar'): void {
  if (v.anulado) throw new ConflictException('La valoración está anulada y no se puede modificar');
  if (v.estado !== EstadoValoracion.BORRADOR) {
    throw new ConflictException(
      `Solo se puede ${accion} una valoración en borrador (esta está ${v.estado}). ` +
        'Para corregirla, registre una nueva valoración o anule esta con justificación.',
    );
  }
}
