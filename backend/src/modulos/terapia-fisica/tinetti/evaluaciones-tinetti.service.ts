import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Between, DataSource, FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { aplicarAuditoriaCreacion } from 'src/common/auditoria/auditoria.helper';
import { ListarRegistrosDto } from 'src/common/dto/listar-registros.dto';
import { hoyCostaRica } from 'src/common/utils/hoyCostaRica';
import { anularRegistroPorId } from 'src/common/valoraciones/anulacion.helper';
import { calcularEdad, errorFechaAnteriorAlNacimiento } from 'src/common/valoraciones/edad.helper';
import { errorDeFecha, erroresDeRango } from 'src/common/valoraciones/fecha.helper';
import { obtenerNacimientoDelResidente } from 'src/common/valoraciones/residente.helper';
import { exigirExpediente, exigirExpedienteEscribible } from 'src/common/valoraciones/valoracion-lock.helper';
import { EvaluacionTinetti } from '../entities/evaluacion-tinetti.entity';
import { calcularTinetti } from './calcular-tinetti';
import { CrearEvaluacionTinettiDto } from './dto/evaluacion-tinetti.dto';
import { ITEMS_TINETTI_V1, ItemsTinetti, VERSION_TINETTI } from './tinetti-v1.instrumento';

const ETIQUETA = 'Evaluación de Tinetti';

/**
 * Escala de Tinetti (B.1.7 / RF-TF-09): serie de evaluaciones por expediente SIN máquina de estados. Cada
 * evaluación es un registro independiente (RN-02); no hay edición ni DELETE: un error se corrige anulando (con
 * motivo) y registrando otra.
 *
 * Calculado en el servidor, almacenado y nunca recalculado (RN-04/09/10): los tres puntajes, `riesgoCaida`,
 * `versionInstrumento`, `edadMomentoEvaluacion` (años cumplidos a la fecha de la evaluación, desde la fecha de
 * nacimiento del residente) y `numeroControl`. El cliente solo envía los veinte ítems. El examinador es el usuario
 * autenticado. Expediente `Inactivo`: no se pueden registrar evaluaciones nuevas (409 `EXPEDIENTE_INACTIVO`); el listado y la
 * anulación siguen disponibles.
 *
 * `numeroControl` (RF-TF-09; la edición manual sigue pendiente de la Jefatura, P8): consecutivo por expediente. El
 * `POST` corre en una transacción `READ COMMITTED` que toma primero el candado `FOR UPDATE` del expediente (el
 * mismo primer candado de la convención), así dos registros simultáneos se serializan y cada uno ve el máximo ya
 * confirmado por el anterior: sin duplicados ni huecos por concurrencia. El máximo se calcula sobre TODAS las
 * filas, incluidas las anuladas, de modo que un número nunca se reutiliza. Respaldo en la base:
 * `UNIQUE (expediente_id, numero_control)`.
 */
@Injectable()
export class EvaluacionesTinettiService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** Más reciente primero. Por defecto excluye las anuladas (`incluirAnulados`). */
  async listar(expedienteId: number, filtros: ListarRegistrosDto): Promise<EvaluacionTinetti[]> {
    const m = this.dataSource.manager;
    await exigirExpediente(m, expedienteId);
    const errores = erroresDeRango(filtros.desde, filtros.hasta);
    if (errores.length) throw new BadRequestException({ message: 'Datos inconsistentes', errores });

    const where: FindOptionsWhere<EvaluacionTinetti> = { expedienteId };
    if (!filtros.incluirAnulados) where.anulado = false;
    if (filtros.desde !== undefined && filtros.hasta !== undefined) where.fecha = Between(filtros.desde, filtros.hasta);
    else if (filtros.desde !== undefined) where.fecha = MoreThanOrEqual(filtros.desde);
    else if (filtros.hasta !== undefined) where.fecha = LessThanOrEqual(filtros.hasta);

    return m.getRepository(EvaluacionTinetti).find({ where, order: { fecha: 'DESC', id: 'DESC' } });
  }

  async crear(expedienteId: number, dto: CrearEvaluacionTinettiDto, usuarioId: number): Promise<EvaluacionTinetti> {
    return this.dataSource.transaction('READ COMMITTED', async (m) => {
      // RN-01: 404 si el expediente no existe y 409 EXPEDIENTE_INACTIVO si está inactivo (antes de consumir número de control);
      // además toma el candado FOR UPDATE que serializa el número de control.
      await exigirExpedienteEscribible(m, expedienteId, true);
      // 409 si el expediente no tiene residente/fecha de nacimiento: no se inventa la edad.
      const nacimiento = await obtenerNacimientoDelResidente(m, expedienteId);

      const hoy = hoyCostaRica();
      const fecha = dto.fecha ?? hoy;
      const errorFecha = errorDeFecha(fecha, hoy, 'de la evaluación') ?? errorFechaAnteriorAlNacimiento(fecha, nacimiento, 'de la evaluación');
      if (errorFecha) throw new BadRequestException({ message: 'Datos inconsistentes', errores: [errorFecha] });

      // Solo se leen los veinte ítems del cuerpo: lo calculado jamás sale del cliente.
      const items = Object.fromEntries(ITEMS_TINETTI_V1.map((i) => [i.campo, dto[i.campo]])) as ItemsTinetti;
      const resultado = calcularTinetti(items);

      const repo = m.getRepository(EvaluacionTinetti);
      const [ultima] = await repo.find({ where: { expedienteId }, order: { numeroControl: 'DESC' }, take: 1 });
      const nueva = repo.create({
        expedienteId,
        fecha,
        edadMomentoEvaluacion: calcularEdad(nacimiento, fecha), // a la fecha de la evaluación, no a hoy
        usuarioExaminadorId: usuarioId, // siempre el usuario autenticado, nunca el body
        numeroControl: (ultima?.numeroControl ?? 0) + 1,
        ...items,
        ...resultado,
        versionInstrumento: VERSION_TINETTI,
        observaciones: dto.observaciones ?? null,
      });
      aplicarAuditoriaCreacion(nueva, usuarioId);
      return repo.save(nueva);
    });
  }

  /** RN-02: nunca se borra; `anulado = true` con motivo, usuario y fecha. 404 si no existe, 409 si ya estaba anulada. */
  anular(id: number, motivo: string, usuarioId: number): Promise<EvaluacionTinetti> {
    return anularRegistroPorId(this.dataSource, {
      entidad: EvaluacionTinetti,
      id,
      motivo,
      usuarioId,
      etiqueta: ETIQUETA,
      mensajeYaAnulado: 'La evaluación de Tinetti ya está anulada',
    });
  }
}
