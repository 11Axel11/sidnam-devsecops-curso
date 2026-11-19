import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import { EstadoValoracion } from 'src/common/enums/estadoValoracion.enum';
import { exigirExpediente } from 'src/common/valoraciones/valoracion-lock.helper';
import { TIPO_EVENTO_IMPORTANTE_CAIDA } from 'src/modulos/catalogos/seed/catalogos-iniciales';
import { TipoEventoImportante } from 'src/modulos/catalogos/entities/catalogos.entities';
import { ValoracionNutricional } from 'src/modulos/nutricion/entities/valoracion-nutricional.entity';
import { EvaluacionBarthel } from 'src/modulos/terapia-fisica/entities/evaluacion-barthel.entity';
import { EventoImportanteTf } from 'src/modulos/terapia-fisica/entities/evento-importante-tf.entity';
import { ValoracionFisioterapeutica } from 'src/modulos/terapia-fisica/entities/valoracion-fisioterapeutica.entity';
import { FichaResumenDto } from './ficha-resumen.dto';
import { armarFicha, FilaValoracion } from './ficha-resumen.mapeo';

const coincideNombre = (nombre: string, esperado: string): boolean => nombre.trim().toLowerCase() === esperado.toLowerCase();

/**
 * Ficha resumen interdisciplinaria (RF-TR-01, CA-23). SOLO LECTURA. Lee los datos con repositorios INTERNOS (no por HTTP y
 * sin los permisos de `Nutricion` ni `TerapiaFisica`: el endpoint exige solo `FichaResumen:Ver`) y pide únicamente las
 * columnas necesarias; el DTO de respuesta es una lista blanca (`ficha-resumen.mapeo.ts`).
 *
 * Un bloque sin datos sale con `datos: null` y su `motivo` (nunca un error). Un expediente inexistente es 404; uno
 * INACTIVO se consulta igual (las lecturas no se bloquean).
 */
@Injectable()
export class FichaResumenService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async obtener(expedienteId: number): Promise<FichaResumenDto> {
    await exigirExpediente(this.dataSource.manager, expedienteId); // 404

    const [barthel, nutricionVigente, terapiaFisicaVigente, eventoCaida, ultimaTerapiaFisica, ultimaNutricion] = await Promise.all([
      this.ultimoBarthel(expedienteId),
      this.nutricionVigente(expedienteId),
      this.terapiaFisicaVigente(expedienteId),
      this.ultimoEventoCaida(expedienteId),
      this.ultimaValoracion(ValoracionFisioterapeutica, expedienteId),
      this.ultimaValoracion(ValoracionNutricional, expedienteId),
    ]);
    return armarFicha(expedienteId, { barthel, nutricionVigente, terapiaFisicaVigente, eventoCaida, ultimaTerapiaFisica, ultimaNutricion });
  }

  /** Última evaluación de Barthel NO anulada: la de fecha más reciente (empate: la registrada después). */
  private async ultimoBarthel(expedienteId: number) {
    const [fila] = await this.dataSource.getRepository(EvaluacionBarthel).find({
      select: { id: true, fecha: true, gradoDependencia: true },
      where: { expedienteId, anulado: false },
      order: { fecha: 'DESC', id: 'DESC' },
      take: 1,
    });
    return fila ?? null;
  }

  private async nutricionVigente(expedienteId: number) {
    const [fila] = await this.dataSource.getRepository(ValoracionNutricional).find({
      select: {
        id: true,
        alergiaMedicamentos: true,
        detalleAlergiaMedicamentos: true,
        datoFuncional: { id: true, nombre: true },
      },
      relations: { datoFuncional: true },
      where: { expedienteId, estado: EstadoValoracion.VIGENTE, anulado: false },
      take: 1,
    });
    return fila ?? null;
  }

  private async terapiaFisicaVigente(expedienteId: number) {
    const [fila] = await this.dataSource.getRepository(ValoracionFisioterapeutica).find({
      select: { id: true, antecedentesCaidas: true, usoAyudasBiomecanicas: true, detalleAyudasBiomecanicas: true },
      where: { expedienteId, estado: EstadoValoracion.VIGENTE, anulado: false },
      take: 1,
    });
    return fila ?? null;
  }

  /**
   * Último evento NO anulado de tipo «Caída» (el tipo se identifica por la constante del seed, sin mayúsculas ni
   * espacios; un tipo desactivado después sigue contando, es histórico).
   */
  private async ultimoEventoCaida(expedienteId: number) {
    const tipos = await this.dataSource.getRepository(TipoEventoImportante).find({ select: { id: true, nombre: true } });
    const idsCaida = tipos.filter((t) => coincideNombre(t.nombre, TIPO_EVENTO_IMPORTANTE_CAIDA)).map((t) => t.id);
    if (idsCaida.length === 0) return null;
    const [fila] = await this.dataSource.getRepository(EventoImportanteTf).find({
      select: { id: true, fechaHora: true },
      where: { expedienteId, anulado: false, tipoEventoId: In(idsCaida) },
      order: { fechaHora: 'DESC', id: 'DESC' },
      take: 1,
    });
    return fila ?? null;
  }

  /** Vigente, más reciente confirmada no anulada (reemplazada) y si existe algún borrador no anulado. */
  private async ultimaValoracion(entidad: typeof ValoracionFisioterapeutica | typeof ValoracionNutricional, expedienteId: number) {
    const repo = this.dataSource.getRepository<ValoracionFisioterapeutica | ValoracionNutricional>(entidad as never);
    const select = { id: true, fecha: true, estado: true };
    const [vigente] = await repo.find({ select, where: { expedienteId, estado: EstadoValoracion.VIGENTE, anulado: false }, take: 1 });
    const [reemplazada] = vigente
      ? []
      : await repo.find({
          select,
          where: { expedienteId, estado: EstadoValoracion.REEMPLAZADA, anulado: false },
          order: { fecha: 'DESC', id: 'DESC' },
          take: 1,
        });
    const [borrador] = vigente || reemplazada ? [] : await repo.find({ select, where: { expedienteId, estado: EstadoValoracion.BORRADOR, anulado: false }, take: 1 });
    const fila = (v?: FilaValoracion): FilaValoracion | null => (v ? { fecha: v.fecha, estado: v.estado } : null);
    return { vigente: fila(vigente), masRecienteConfirmada: fila(reemplazada), hayBorrador: Boolean(borrador) };
  }
}
