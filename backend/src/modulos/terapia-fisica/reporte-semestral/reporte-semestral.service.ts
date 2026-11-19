import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Response } from 'express';
import { Between, DataSource, In, LessThanOrEqual } from 'typeorm';
import { EstadoExpediente } from 'src/common/enums/estadosExpedientes.enum';
import { EstadoValoracion } from 'src/common/enums/estadoValoracion.enum';
import { PdfHtmlService } from 'src/common/services/pdf-html.service';
import { hoyCostaRica } from 'src/common/utils/hoyCostaRica';
import { Expediente_Residente } from 'src/modulos/residentes/entities/expedientes.entity';
import { AplicacionTestMovimientoEjercicio } from '../entities/aplicacion-test-movimiento-ejercicio.entity';
import { AplicacionTestMovimiento } from '../entities/aplicacion-test-movimiento.entity';
import { EvaluacionBarthel } from '../entities/evaluacion-barthel.entity';
import { EvaluacionTinetti } from '../entities/evaluacion-tinetti.entity';
import { ValoracionFisioterapeutica } from '../entities/valoracion-fisioterapeutica.entity';
import { ReporteSemestralQueryDto } from './reporte-semestral.dto';
import { construirHtmlReporteSemestral } from './reporte-semestral.html';
import { armarReporte, DatosDelReporte, periodoDe, ReporteSemestral } from './reporte-semestral.logica';

/**
 * Reporte semestral de Terapia Física (RF-TF-12, CA-12): PDF A4 apaisado sobre el servicio y la plantilla compartidos
 * (`PdfHtmlService` + `buildStandardPdfHtml`). SOLO LECTURA. Seis consultas en total, todas por rango de fechas sobre todos los
 * expedientes y repartidas en memoria (sin N+1). No guarda el nombre ni el código de la profesional.
 */
@Injectable()
export class ReporteSemestralService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly pdf: PdfHtmlService,
  ) {}

  /** Valida el periodo contra la fecha de hoy (Costa Rica). */
  validarPeriodo(anio: number, semestre: 1 | 2, hoy: string): void {
    const periodo = periodoDe(anio, semestre);
    const errores: string[] = [];
    if (periodo.inicio > hoy) errores.push(`El periodo ${periodo.romano} ${anio} todavía no ha comenzado`);
    if (errores.length) throw new BadRequestException({ message: 'Datos inconsistentes', errores });
  }

  /** Lee los datos del periodo y arma el reporte (estructura de datos, sin HTML). */
  async construir(anio: number, semestre: 1 | 2, hoy: string = hoyCostaRica()): Promise<ReporteSemestral> {
    this.validarPeriodo(anio, semestre, hoy);
    const periodo = periodoDe(anio, semestre);
    const ds = this.dataSource;

    const [expedientes, barthel, tinetti, valoraciones, aplicaciones] = await Promise.all([
      ds.getRepository(Expediente_Residente).find({
        select: { id_expediente: true, estado: true, residente: { id_adulto_mayor: true, nombre: true, apellido1: true, apellido2: true, fecha_nacimiento: true } },
        relations: { residente: true },
      }),
      ds.getRepository(EvaluacionBarthel).find({
        select: { id: true, expedienteId: true, fecha: true, puntajeTotal: true, gradoDependencia: true },
        where: { anulado: false, fecha: Between(periodo.anteriorInicio, periodo.fin) },
      }),
      ds.getRepository(EvaluacionTinetti).find({
        select: { id: true, expedienteId: true, fecha: true, puntajeTotal: true, puntajeEquilibrio: true, puntajeMarcha: true },
        where: { anulado: false, fecha: Between(periodo.anteriorInicio, periodo.fin) },
      }),
      ds.getRepository(ValoracionFisioterapeutica).find({
        select: { id: true, expedienteId: true, fecha: true, diagnosticoDiferencial: true, tratamiento: true, avances: true, usoAyudasBiomecanicas: true, detalleAyudasBiomecanicas: true },
        where: { anulado: false, estado: In([EstadoValoracion.VIGENTE, EstadoValoracion.REEMPLAZADA]), fecha: LessThanOrEqual(periodo.fin) },
      }),
      ds.getRepository(AplicacionTestMovimiento).find({
        select: { id: true, expedienteId: true, fecha: true },
        where: { anulado: false, fecha: Between(periodo.inicio, periodo.fin) },
      }),
    ]);

    // Ejercicios solo de la aplicación más reciente de cada expediente (una consulta con IN).
    const ultimaPorExp = new Map<number, { id: number; fecha: string }>();
    for (const a of aplicaciones) {
      const u = ultimaPorExp.get(a.expedienteId);
      if (!u || a.fecha > u.fecha || (a.fecha === u.fecha && a.id > u.id)) ultimaPorExp.set(a.expedienteId, { id: a.id, fecha: a.fecha });
    }
    const idsAplicacion = [...ultimaPorExp.values()].map((u) => u.id);
    const ejerciciosRows = idsAplicacion.length
      ? await ds.getRepository(AplicacionTestMovimientoEjercicio).find({
          select: { aplicacionId: true, ejercicioId: true, resultado: true, ejercicio: { id: true, nombre: true } },
          relations: { ejercicio: true },
          where: { aplicacionId: In(idsAplicacion) },
        })
      : [];

    const datos: DatosDelReporte = {
      expedientes: expedientes
        .filter((x) => x.residente)
        .map((x) => ({
          id: x.id_expediente,
          inactivo: x.estado === EstadoExpediente.Inactivo,
          nombre: x.residente.nombre,
          apellido1: x.residente.apellido1,
          apellido2: x.residente.apellido2,
          fechaNacimiento: x.residente.fecha_nacimiento,
        })),
      barthel,
      tinetti,
      valoraciones,
      aplicaciones,
      ejercicios: ejerciciosRows.map((x) => ({ aplicacionId: x.aplicacionId, ejercicioId: x.ejercicioId, ejercicio: x.ejercicio?.nombre ?? '', resultado: x.resultado })),
    };
    return armarReporte(periodo, datos, hoy);
  }

  /** HTML completo del informe (útil para pruebas). */
  async construirHtml(dto: ReporteSemestralQueryDto, hoy: string = hoyCostaRica()): Promise<string> {
    const reporte = await this.construir(dto.anio, dto.semestre, hoy);
    return construirHtmlReporteSemestral(reporte, hoy, { profesionalNombre: dto.profesionalNombre, profesionalCodigo: dto.profesionalCodigo });
  }

  async generarPdf(dto: ReporteSemestralQueryDto, res: Response): Promise<void> {
    const html = await this.construirHtml(dto);
    await this.pdf.generarDesdeHtml(html, res, {
      filename: `Informe_TerapiaFisica_${dto.anio}_Semestre${dto.semestre}.pdf`,
      format: 'A4',
      landscape: true,
      margin: { top: '14mm', right: '12mm', bottom: '14mm', left: '12mm' },
      waitUntil: 'networkidle0',
      ensureAssets: true,
      disposition: 'attachment',
    });
  }
}
