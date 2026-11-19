import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { aplicarAuditoriaCreacion } from 'src/common/auditoria/auditoria.helper';
import { ListarRegistrosDto } from 'src/common/dto/listar-registros.dto';
import { hoyCostaRica } from 'src/common/utils/hoyCostaRica';
import { anularRegistroPorId } from 'src/common/valoraciones/anulacion.helper';
import { calcularEdad, errorFechaAnteriorAlNacimiento } from 'src/common/valoraciones/edad.helper';
import { errorDeFecha, erroresDeRango } from 'src/common/valoraciones/fecha.helper';
import { obtenerNacimientoDelResidente } from 'src/common/valoraciones/residente.helper';
import { exigirExpediente, exigirExpedienteEscribible } from 'src/common/valoraciones/valoracion-lock.helper';
import { ControlNutricional } from '../entities/control-nutricional.entity';
import { calcularImc } from './calcular-imc';
import { armarSerie, ControlNutricionalConVariacion } from './control-nutricional.lectura';
import { CrearControlNutricionalDto } from './dto/control-nutricional.dto';

const ETIQUETA = 'Control nutricional';

/**
 * Control y evaluación del estado nutricional (B.1.9 / RF-NU-01 y RF-NU-02). Serie histórica por
 * expediente SIN máquina de estados: cada control es un registro independiente que no sobrescribe al
 * anterior (RN-02). No hay edición ni DELETE: un error se corrige anulando (con motivo) y registrando
 * otro control.
 *
 * Calculados en el servidor, almacenados y nunca recalculados (RN-04): `edadMomentoControl` (años
 * cumplidos a la fecha del control, desde `residente.fecha_nacimiento`) e `imc`. Ningún dato calculado
 * se acepta del cliente (el DTO no los declara).
 *
 * Expediente `Inactivo` (cerrado): no se pueden registrar controles nuevos (409 `EXPEDIENTE_INACTIVO`); la consulta del
 * listado (RF-NU-02) y la anulación siguen disponibles.
 */
@Injectable()
export class ControlesNutricionalesService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Serie histórica del expediente, del control más reciente al más antiguo, con la variación de peso e
   * IMC respecto del control no anulado anterior. Por defecto excluye los anulados (`incluirAnulados`).
   */
  async listar(expedienteId: number, filtros: ListarRegistrosDto): Promise<ControlNutricionalConVariacion[]> {
    const m = this.dataSource.manager;
    await exigirExpediente(m, expedienteId);
    const errores = erroresDeRango(filtros.desde, filtros.hasta);
    if (errores.length) throw new BadRequestException({ message: 'Datos inconsistentes', errores });

    // Serie completa: las variaciones se calculan antes de aplicar el rango de fechas.
    const todos = await m.getRepository(ControlNutricional).find({
      where: { expedienteId },
      order: { fecha: 'ASC', id: 'ASC' },
    });
    return armarSerie(todos, { desde: filtros.desde, hasta: filtros.hasta, incluirAnulados: filtros.incluirAnulados ?? false });
  }

  async crear(expedienteId: number, dto: CrearControlNutricionalDto, usuarioId: number): Promise<ControlNutricional> {
    const m = this.dataSource.manager;
    // RN-01: 404 si el expediente no existe (nunca se crea implícitamente); 409 EXPEDIENTE_INACTIVO si está inactivo.
    await exigirExpedienteEscribible(m, expedienteId);
    // 409 si no hay fecha de nacimiento del residente.
    const nacimiento = await obtenerNacimientoDelResidente(m, expedienteId);

    const hoy = hoyCostaRica();
    const fecha = dto.fecha ?? hoy;
    const errorFecha = errorDeFecha(fecha, hoy, 'del control') ?? errorFechaAnteriorAlNacimiento(fecha, nacimiento);
    if (errorFecha) throw new BadRequestException({ message: 'Datos inconsistentes', errores: [errorFecha] });

    const repo = m.getRepository(ControlNutricional);
    const nuevo = repo.create({
      expedienteId,
      fecha,
      edadMomentoControl: calcularEdad(nacimiento, fecha), // a la fecha del control, no a hoy
      peso: dto.peso,
      talla: dto.talla,
      circunferenciaBraquial: dto.circunferenciaBraquial ?? null,
      circunferenciaPantorrilla: dto.circunferenciaPantorrilla ?? null,
      alturaRodilla: dto.alturaRodilla ?? null,
      fuerzaMuscular: dto.fuerzaMuscular ?? null,
      imc: calcularImc(dto.peso, dto.talla),
      interpretacion: dto.interpretacion ?? null,
    });
    aplicarAuditoriaCreacion(nuevo, usuarioId);
    return repo.save(nuevo);
  }

  /** RN-02: nunca se borra; `anulado = true` con motivo, usuario y fecha. 404 si no existe, 409 si ya estaba anulado. */
  anular(id: number, motivo: string, usuarioId: number): Promise<ControlNutricional> {
    return anularRegistroPorId(this.dataSource, {
      entidad: ControlNutricional,
      id,
      motivo,
      usuarioId,
      etiqueta: ETIQUETA,
      mensajeYaAnulado: 'El control nutricional ya está anulado',
    });
  }
}
