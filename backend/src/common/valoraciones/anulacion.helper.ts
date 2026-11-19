import { ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource, EntityTarget, FindOptionsWhere } from 'typeorm';
import { aplicarAuditoriaModificacion } from 'src/common/auditoria/auditoria.helper';
import { Anulable } from './anulable.entity';

/**
 * Marca un registro como anulado (RN-02). Llamar DENTRO de la transacción que
 * ya tiene bloqueada la fila, y guardar la entidad después. `usuarioId` sale
 * de `req.user.id`, nunca del body. 409 si ya estaba anulado.
 */
export function anularRegistro<T extends Anulable>(
  entidad: T,
  motivo: string,
  usuarioId: number,
  mensajeYaAnulado: string,
): T {
  if (entidad.anulado) throw new ConflictException(mensajeYaAnulado);
  entidad.anulado = true;
  entidad.motivoAnulacion = motivo;
  entidad.anuladoPorId = usuarioId;
  entidad.fechaAnulacion = new Date();
  aplicarAuditoriaModificacion(entidad, usuarioId);
  return entidad;
}

/**
 * Anula un registro SIN máquina de estados (eventos importantes, aplicaciones del test de movimiento,
 * controles nutricionales): transacción `READ COMMITTED`, lee la fila con `FOR UPDATE` (404 si no
 * existe), `anularRegistro` (409 si ya estaba anulada) y guarda. El candado hace que dos anulaciones
 * simultáneas del mismo registro den un 200 y un 409, nunca dos 200.
 *
 * Las valoraciones con estados no usan esta función: bloquean con `bloquearValoracion`.
 */
export async function anularRegistroPorId<T extends Anulable & { id: number }>(
  dataSource: DataSource,
  p: {
    entidad: EntityTarget<T>;
    id: number;
    motivo: string;
    usuarioId: number;
    /** Nombre para el 404, p. ej. «Evento importante» → «Evento importante 7 no existe». */
    etiqueta: string;
    mensajeYaAnulado: string;
  },
): Promise<T> {
  return dataSource.transaction('READ COMMITTED', async (m) => {
    const repo = m.getRepository(p.entidad);
    const registro = await repo.findOne({
      where: { id: p.id } as FindOptionsWhere<T>,
      lock: { mode: 'pessimistic_write' },
    });
    if (!registro) throw new NotFoundException(`${p.etiqueta} ${p.id} no existe`);
    anularRegistro(registro, p.motivo, p.usuarioId, p.mensajeYaAnulado);
    return repo.save(registro);
  });
}
