import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Between, DataSource, EntityManager, FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { aplicarAuditoriaCreacion } from 'src/common/auditoria/auditoria.helper';
import { anularRegistroPorId } from 'src/common/valoraciones/anulacion.helper';
import {
  ahoraSinFraccion,
  erroresDeRango,
  finDelDiaCR,
  inicioDelDiaCR,
  parsearFechaHora,
} from 'src/common/valoraciones/fecha.helper';
import { exigirExpediente, exigirExpedienteEscribible } from 'src/common/valoraciones/valoracion-lock.helper';
import { TipoEventoImportante } from 'src/modulos/catalogos/entities/catalogos.entities';
import { EventoImportanteTf } from '../entities/evento-importante-tf.entity';
import { CrearEventoImportanteDto, ListarEventosImportantesDto } from './dto/evento-importante.dto';
import { aDetalleEvento, EventoImportanteDetalle } from './evento-importante.lectura';
import { erroresDeEvento } from './evento-importante.reglas';

const ETIQUETA = 'Evento importante';

/**
 * Eventos importantes (B.1.5 / RF-TF-07): bitácora histórica del expediente, INDEPENDIENTE de la valoración,
 * sin máquina de estados. No hay edición ni DELETE: un error se corrige anulando (con motivo) y registrando
 * otro evento. La persona que lo registra es `creadoPorId` (del token, nunca del body).
 *
 * Expediente `Inactivo`: no se pueden registrar eventos nuevos (409 `EXPEDIENTE_INACTIVO`); el listado y la anulación siguen disponibles.
 */
@Injectable()
export class EventosImportantesService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Del evento más reciente al más antiguo (CA-07). Por defecto excluye los anulados (`incluirAnulados`).
   * `desde`/`hasta` son días de Costa Rica, ambos inclusivos; `tipoEventoId` filtra por tipo.
   */
  async listar(expedienteId: number, filtros: ListarEventosImportantesDto): Promise<EventoImportanteDetalle[]> {
    const m = this.dataSource.manager;
    await exigirExpediente(m, expedienteId);
    const errores = erroresDeRango(filtros.desde, filtros.hasta);
    if (errores.length) throw new BadRequestException({ message: 'Datos inconsistentes', errores });

    const where: FindOptionsWhere<EventoImportanteTf> = { expedienteId };
    if (!filtros.incluirAnulados) where.anulado = false;
    if (filtros.tipoEventoId !== undefined) where.tipoEventoId = filtros.tipoEventoId;
    const desde = filtros.desde !== undefined ? inicioDelDiaCR(filtros.desde) : undefined;
    const hasta = filtros.hasta !== undefined ? finDelDiaCR(filtros.hasta) : undefined;
    if (desde && hasta) where.fechaHora = Between(desde, hasta);
    else if (desde) where.fechaHora = MoreThanOrEqual(desde);
    else if (hasta) where.fechaHora = LessThanOrEqual(hasta);

    const eventos = await m.getRepository(EventoImportanteTf).find({
      where,
      relations: { tipoEvento: true },
      order: { fechaHora: 'DESC', id: 'DESC' },
    });
    return eventos.map(aDetalleEvento);
  }

  async crear(expedienteId: number, dto: CrearEventoImportanteDto, usuarioId: number): Promise<EventoImportanteDetalle> {
    const m = this.dataSource.manager;
    // RN-01: el expediente debe existir (404) y estar activo (409 EXPEDIENTE_INACTIVO); nunca se crea implícitamente.
    await exigirExpedienteEscribible(m, expedienteId);

    const ahora = new Date();
    const fechaHora = dto.fechaHora ? parsearFechaHora(dto.fechaHora) : ahoraSinFraccion(ahora);
    const tipo = await m.getRepository(TipoEventoImportante).findOne({ where: { id: dto.tipoEventoId } });
    const errores = erroresDeEvento({ fechaHora, tipoEventoId: dto.tipoEventoId, tipo, descripcion: dto.descripcion }, ahora);
    if (errores.length) throw new BadRequestException({ message: 'Datos inconsistentes', errores });

    const repo = m.getRepository(EventoImportanteTf);
    const nuevo = repo.create({
      expedienteId,
      fechaHora: fechaHora as Date, // sin errores ⇒ no es null
      tipoEventoId: dto.tipoEventoId,
      descripcion: dto.descripcion ?? null,
    });
    aplicarAuditoriaCreacion(nuevo, usuarioId);
    const guardado = await repo.save(nuevo);
    return aDetalleEvento({ ...guardado, tipoEvento: tipo as TipoEventoImportante });
  }

  /** RN-02: nunca se borra; `anulado = true` con motivo, usuario y fecha. 404 si no existe, 409 si ya estaba anulado. */
  async anular(id: number, motivo: string, usuarioId: number): Promise<EventoImportanteDetalle> {
    await anularRegistroPorId(this.dataSource, {
      entidad: EventoImportanteTf,
      id,
      motivo,
      usuarioId,
      etiqueta: ETIQUETA,
      mensajeYaAnulado: 'El evento importante ya está anulado',
    });
    return this.detalle(this.dataSource.manager, id);
  }

  private async detalle(m: EntityManager, id: number): Promise<EventoImportanteDetalle> {
    const e = await m.getRepository(EventoImportanteTf).findOne({ where: { id }, relations: { tipoEvento: true } });
    if (!e) throw new NotFoundException(`${ETIQUETA} ${id} no existe`);
    return aDetalleEvento(e);
  }
}
