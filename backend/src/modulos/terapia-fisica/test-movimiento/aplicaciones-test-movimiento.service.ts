import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Between, DataSource, EntityManager, FindOptionsWhere, In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { aplicarAuditoriaCreacion } from 'src/common/auditoria/auditoria.helper';
import { ListarRegistrosDto } from 'src/common/dto/listar-registros.dto';
import { hoyCostaRica } from 'src/common/utils/hoyCostaRica';
import { anularRegistroPorId } from 'src/common/valoraciones/anulacion.helper';
import { errorDeFecha, erroresDeRango } from 'src/common/valoraciones/fecha.helper';
import { exigirExpediente, exigirExpedienteEscribible } from 'src/common/valoraciones/valoracion-lock.helper';
import { EjercicioTestMovimiento } from 'src/modulos/catalogos/entities/catalogos.entities';
import { AplicacionTestMovimiento } from '../entities/aplicacion-test-movimiento.entity';
import { AplicacionTestMovimientoEjercicio } from '../entities/aplicacion-test-movimiento-ejercicio.entity';
import { CrearAplicacionTestMovimientoDto } from './dto/aplicacion-test-movimiento.dto';
import { erroresDeEjercicios } from './test-movimiento.reglas';
import { aDetalleAplicacion, AplicacionTestMovimientoDetalle } from './test-movimiento.lectura';

const ETIQUETA = 'Aplicación del test de movimiento';

/**
 * Test de Movimiento y Coordinación (B.1.8 / RF-TF-10): aplicaciones sucesivas por expediente, cada una un
 * registro independiente (cabecera + un detalle por ejercicio), SIN máquina de estados. No hay edición ni
 * DELETE: una aplicación errónea se anula (con motivo) y se registra otra.
 *
 * `crear` valida en bloque (fecha + ejercicios contra el catálogo) y escribe cabecera y detalle en UNA
 * transacción: todo o nada. El responsable es el usuario autenticado (Anexo C.1), nunca el body.
 */
@Injectable()
export class AplicacionesTestMovimientoService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** De la más reciente a la más antigua, cada una con sus ejercicios. Por defecto excluye las anuladas. */
  async listar(expedienteId: number, filtros: ListarRegistrosDto): Promise<AplicacionTestMovimientoDetalle[]> {
    const m = this.dataSource.manager;
    await exigirExpediente(m, expedienteId);
    const errores = erroresDeRango(filtros.desde, filtros.hasta);
    if (errores.length) throw new BadRequestException({ message: 'Datos inconsistentes', errores });

    const where: FindOptionsWhere<AplicacionTestMovimiento> = { expedienteId };
    if (!filtros.incluirAnulados) where.anulado = false;
    if (filtros.desde !== undefined && filtros.hasta !== undefined) where.fecha = Between(filtros.desde, filtros.hasta);
    else if (filtros.desde !== undefined) where.fecha = MoreThanOrEqual(filtros.desde);
    else if (filtros.hasta !== undefined) where.fecha = LessThanOrEqual(filtros.hasta);

    const cabeceras = await m.getRepository(AplicacionTestMovimiento).find({ where, order: { fecha: 'DESC', id: 'DESC' } });
    if (!cabeceras.length) return [];

    const filas = await m.getRepository(AplicacionTestMovimientoEjercicio).find({
      where: { aplicacionId: In(cabeceras.map((c) => c.id)) },
      relations: { ejercicio: true },
    });
    return cabeceras.map((c) =>
      aDetalleAplicacion(
        c,
        filas.filter((f) => f.aplicacionId === c.id),
      ),
    );
  }

  /** Detalle de una aplicación (cualquier estado, incluidas las anuladas). */
  obtenerDetalle(id: number): Promise<AplicacionTestMovimientoDetalle> {
    return this.detalle(this.dataSource.manager, id);
  }

  async crear(
    expedienteId: number,
    dto: CrearAplicacionTestMovimientoDto,
    usuarioId: number,
  ): Promise<AplicacionTestMovimientoDetalle> {
    return this.dataSource.transaction('READ COMMITTED', async (m) => {
      // RN-01: el expediente debe existir (404) y estar activo (409 EXPEDIENTE_INACTIVO); nunca se crea implícitamente.
      await exigirExpedienteEscribible(m, expedienteId);

      const hoy = hoyCostaRica();
      const fecha = dto.fecha ?? hoy;
      const catalogo = await m.getRepository(EjercicioTestMovimiento).find({ order: { id: 'ASC' } });
      const errores = [
        errorDeFecha(fecha, hoy, 'de la aplicación'),
        ...erroresDeEjercicios(
          dto.ejercicios.map((e) => e.ejercicioId),
          catalogo,
        ),
      ].filter((e): e is string => e !== null);
      if (errores.length) throw new BadRequestException({ message: 'Datos inconsistentes', errores });

      const cabeceras = m.getRepository(AplicacionTestMovimiento);
      const cabecera = cabeceras.create({ expedienteId, fecha, usuarioResponsableId: usuarioId });
      aplicarAuditoriaCreacion(cabecera, usuarioId);
      const guardada = await cabeceras.save(cabecera);

      const detalles = m.getRepository(AplicacionTestMovimientoEjercicio);
      const filas = dto.ejercicios.map((e) => {
        const fila = detalles.create({
          aplicacionId: guardada.id,
          ejercicioId: e.ejercicioId,
          modalidad: e.modalidad,
          modificacion: e.modificacion ?? null,
          resultado: e.resultado,
        });
        return aplicarAuditoriaCreacion(fila, usuarioId);
      });
      await detalles.save(filas);

      return this.detalle(m, guardada.id);
    });
  }

  /** RN-02: nunca se borra; `anulado = true` con motivo, usuario y fecha. 404 si no existe, 409 si ya estaba anulada. */
  async anular(id: number, motivo: string, usuarioId: number): Promise<AplicacionTestMovimientoDetalle> {
    await anularRegistroPorId(this.dataSource, {
      entidad: AplicacionTestMovimiento,
      id,
      motivo,
      usuarioId,
      etiqueta: ETIQUETA,
      mensajeYaAnulado: 'La aplicación del test de movimiento ya está anulada',
    });
    return this.detalle(this.dataSource.manager, id);
  }

  private async detalle(m: EntityManager, id: number): Promise<AplicacionTestMovimientoDetalle> {
    const cabecera = await m.getRepository(AplicacionTestMovimiento).findOne({ where: { id } });
    if (!cabecera) throw new NotFoundException(`${ETIQUETA} ${id} no existe`);
    const filas = await m.getRepository(AplicacionTestMovimientoEjercicio).find({
      where: { aplicacionId: id },
      relations: { ejercicio: true },
    });
    return aDetalleAplicacion(cabecera, filas);
  }
}
