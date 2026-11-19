import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Between, DataSource, FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { aplicarAuditoriaCreacion } from 'src/common/auditoria/auditoria.helper';
import { ListarRegistrosDto } from 'src/common/dto/listar-registros.dto';
import { hoyCostaRica } from 'src/common/utils/hoyCostaRica';
import { anularRegistroPorId } from 'src/common/valoraciones/anulacion.helper';
import { errorDeFecha, erroresDeRango } from 'src/common/valoraciones/fecha.helper';
import { exigirExpediente, exigirExpedienteEscribible } from 'src/common/valoraciones/valoracion-lock.helper';
import { EvaluacionBarthel } from '../entities/evaluacion-barthel.entity';
import { ITEMS_BARTHEL_V1, ItemsBarthel, VERSION_BARTHEL } from './barthel-v1.instrumento';
import { calcularBarthel } from './calcular-barthel';
import { CrearEvaluacionBarthelDto } from './dto/evaluacion-barthel.dto';

const ETIQUETA = 'Evaluación de Barthel';

/**
 * Índice de Barthel (B.1.6 / RF-TF-08): serie de evaluaciones por expediente SIN máquina de estados. Cada
 * evaluación es un registro independiente (RN-02); no hay edición ni DELETE: un error se corrige anulando (con
 * motivo) y registrando otra.
 *
 * `puntajeTotal`, `gradoDependencia` y `versionInstrumento` los calcula el servidor con `calcularBarthel`, se
 * almacenan y no se recalculan (RN-04/09/10); el cliente solo envía los diez ítems. El examinador es el usuario
 * autenticado. Expediente `Inactivo`: no se pueden registrar evaluaciones nuevas (409 `EXPEDIENTE_INACTIVO`); el listado y la
 * anulación siguen disponibles.
 */
@Injectable()
export class EvaluacionesBarthelService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** Más reciente primero. Por defecto excluye las anuladas (`incluirAnulados`). */
  async listar(expedienteId: number, filtros: ListarRegistrosDto): Promise<EvaluacionBarthel[]> {
    const m = this.dataSource.manager;
    await exigirExpediente(m, expedienteId);
    const errores = erroresDeRango(filtros.desde, filtros.hasta);
    if (errores.length) throw new BadRequestException({ message: 'Datos inconsistentes', errores });

    const where: FindOptionsWhere<EvaluacionBarthel> = { expedienteId };
    if (!filtros.incluirAnulados) where.anulado = false;
    if (filtros.desde !== undefined && filtros.hasta !== undefined) where.fecha = Between(filtros.desde, filtros.hasta);
    else if (filtros.desde !== undefined) where.fecha = MoreThanOrEqual(filtros.desde);
    else if (filtros.hasta !== undefined) where.fecha = LessThanOrEqual(filtros.hasta);

    return m.getRepository(EvaluacionBarthel).find({ where, order: { fecha: 'DESC', id: 'DESC' } });
  }

  async crear(expedienteId: number, dto: CrearEvaluacionBarthelDto, usuarioId: number): Promise<EvaluacionBarthel> {
    const m = this.dataSource.manager;
    // RN-01: el expediente debe existir (404) y estar activo (409 EXPEDIENTE_INACTIVO); nunca se crea implícitamente.
    await exigirExpedienteEscribible(m, expedienteId);

    const hoy = hoyCostaRica();
    const fecha = dto.fecha ?? hoy;
    const errorFecha = errorDeFecha(fecha, hoy, 'de la evaluación');
    if (errorFecha) throw new BadRequestException({ message: 'Datos inconsistentes', errores: [errorFecha] });

    // Solo se leen los diez ítems del cuerpo: lo calculado jamás sale del cliente.
    const items = Object.fromEntries(ITEMS_BARTHEL_V1.map((i) => [i.campo, dto[i.campo]])) as ItemsBarthel;
    const { puntajeTotal, gradoDependencia } = calcularBarthel(items);

    const repo = m.getRepository(EvaluacionBarthel);
    const nueva = repo.create({
      expedienteId,
      fecha,
      usuarioExaminadorId: usuarioId, // siempre el usuario autenticado, nunca el body
      ...items,
      puntajeTotal,
      gradoDependencia,
      versionInstrumento: VERSION_BARTHEL,
      observaciones: dto.observaciones ?? null,
    });
    aplicarAuditoriaCreacion(nueva, usuarioId);
    return repo.save(nueva);
  }

  /** RN-02: nunca se borra; `anulado = true` con motivo, usuario y fecha. 404 si no existe, 409 si ya estaba anulada. */
  anular(id: number, motivo: string, usuarioId: number): Promise<EvaluacionBarthel> {
    return anularRegistroPorId(this.dataSource, {
      entidad: EvaluacionBarthel,
      id,
      motivo,
      usuarioId,
      etiqueta: ETIQUETA,
      mensajeYaAnulado: 'La evaluación de Barthel ya está anulada',
    });
  }
}
