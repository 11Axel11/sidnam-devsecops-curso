import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { aplicarAuditoriaCreacion, aplicarAuditoriaModificacion } from 'src/common/auditoria/auditoria.helper';
import { EstadoValoracion } from 'src/common/enums/estadoValoracion.enum';
import { hoyCostaRica } from 'src/common/utils/hoyCostaRica';
import { sinIndefinidos } from 'src/common/utils/sinIndefinidos';
import { anularRegistro } from 'src/common/valoraciones/anulacion.helper';
import { confirmarValoracion } from 'src/common/valoraciones/confirmacion.helper';
import {
  bloquearValoracion,
  bloquearValoracionEscribible,
  exigirEditable,
  exigirExpediente,
  exigirExpedienteEscribible,
} from 'src/common/valoraciones/valoracion-lock.helper';
import { AntecedentePersonal } from 'src/modulos/catalogos/entities/catalogos.entities';
import { ValoracionFisioterapeutica } from '../entities/valoracion-fisioterapeutica.entity';
import { ValoracionTfAntecedentePersonal } from '../entities/valoracion-tf-antecedente-personal.entity';
import { cargarAntecedentes, ValoracionFisioterapeuticaDetalle } from './antecedentes.lectura';
import { antecedentesPersonalesPendientes } from './antecedentes.reglas';
import {
  ActualizarValoracionFisioterapeuticaDto,
  CrearValoracionFisioterapeuticaDto,
} from './dto/valoracion-fisioterapeutica.dto';
import { camposFaltantesParaConfirmar, errorDeFecha, validarCoherencia } from './valoracion-fisioterapeutica.reglas';

/**
 * Valoración fisioterapéutica (B.1.2 / B.1.3) con la máquina de estados RN-03:
 *
 *   POST            → crea en `borrador` (guardado parcial).
 *   PATCH :id       → edita SOLO en borrador.
 *   PATCH :id/confirmar → borrador → vigente; en la MISMA transacción la vigente
 *                     anterior del expediente pasa a `reemplazada`.
 *   PATCH :id/anular    → anulado = true (RN-02), con motivo; nunca DELETE.
 *
 * INVARIANTE: a lo sumo UNA valoración `vigente` NO anulada por expediente.
 * No puede expresarse como UNIQUE de SQL sobre un valor de enum condicional,
 * así que se garantiza con exclusión mutua: toda confirmación toma un bloqueo
 * de fila (`FOR UPDATE`) sobre el expediente, de modo que dos confirmaciones
 * simultáneas del mismo expediente se serializan; la segunda ve a la primera
 * ya confirmada (READ COMMITTED lee lo último confirmado) y la desplaza.
 * Las ediciones y anulaciones bloquean la fila de la valoración para que no
 * puedan pisar a una confirmación en curso (nunca se modifica una cerrada).
 *
 * Una valoración anulada conserva el `estado` que tenía (no se "resucita" la
 * anterior: RN-02, nada se anula/edita en cascada) y deja de contar como vigente.
 */
const ETIQUETA = 'Valoración fisioterapéutica';

@Injectable()
export class ValoracionesFisioterapeuticasService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  // ───────────────────────── lecturas ─────────────────────────

  /** Historial completo (incluye reemplazadas y anuladas), de la más reciente a la más antigua. */
  async listar(expedienteId: number): Promise<ValoracionFisioterapeutica[]> {
    await exigirExpediente(this.dataSource.manager, expedienteId);
    return this.dataSource.getRepository(ValoracionFisioterapeutica).find({
      where: { expedienteId },
      order: { fecha: 'DESC', id: 'DESC' },
    });
  }

  /** Solo la vigente, CON sus antecedentes. 404 si el expediente no tiene ninguna (todavía) confirmada. */
  async obtenerVigente(expedienteId: number): Promise<ValoracionFisioterapeuticaDetalle> {
    const m = this.dataSource.manager;
    await exigirExpediente(m, expedienteId);
    const vigente = await m.getRepository(ValoracionFisioterapeutica).findOne({
      where: { expedienteId, estado: EstadoValoracion.VIGENTE, anulado: false },
    });
    if (!vigente) {
      throw new NotFoundException(`El expediente ${expedienteId} no tiene una valoración fisioterapéutica vigente`);
    }
    return { ...vigente, ...(await cargarAntecedentes(m, vigente.id)) };
  }

  /** Detalle de una valoración (cualquier estado) con sus antecedentes personales y traumáticos NO anulados. */
  async obtenerDetalle(id: number): Promise<ValoracionFisioterapeuticaDetalle> {
    const m = this.dataSource.manager;
    const v = await m.getRepository(ValoracionFisioterapeutica).findOne({ where: { id } });
    if (!v) throw new NotFoundException(`${ETIQUETA} ${id} no existe`);
    return { ...v, ...(await cargarAntecedentes(m, id)) };
  }

  // ───────────────────────── escrituras ─────────────────────────

  async crear(
    expedienteId: number,
    dto: CrearValoracionFisioterapeuticaDto,
    usuarioId: number,
  ): Promise<ValoracionFisioterapeutica> {
    const repo = this.dataSource.getRepository(ValoracionFisioterapeutica);
    // RN-01: el expediente debe existir (404) y estar activo (409 EXPEDIENTE_INACTIVO); nunca se crea implícitamente.
    await exigirExpedienteEscribible(this.dataSource.manager, expedienteId);

    const datos = { ...sinIndefinidos(dto), fecha: dto.fecha ?? hoyCostaRica() };
    this.exigirDatosValidos(datos, true);

    const nueva = repo.create({
      ...datos,
      expedienteId,
      estado: EstadoValoracion.BORRADOR,
      usuarioResponsableId: usuarioId, // siempre el usuario autenticado, nunca el body
    });
    aplicarAuditoriaCreacion(nueva, usuarioId);
    return repo.save(nueva);
  }

  async actualizar(
    id: number,
    dto: ActualizarValoracionFisioterapeuticaDto,
    usuarioId: number,
  ): Promise<ValoracionFisioterapeutica> {
    return this.dataSource.transaction('READ COMMITTED', async (m) => {
      const v = await bloquearValoracionEscribible(m, ValoracionFisioterapeutica, id, ETIQUETA);
      exigirEditable(v);

      const cambios = sinIndefinidos(dto);
      if (cambios.fecha === null) delete cambios.fecha; // la fecha no se puede vaciar
      Object.assign(v, cambios);
      this.exigirDatosValidos(v, cambios.fecha !== undefined);

      aplicarAuditoriaModificacion(v, usuarioId);
      return m.getRepository(ValoracionFisioterapeutica).save(v);
    });
  }

  /**
   * borrador → vigente. La mecánica (candado del expediente, candado de la valoración, desplazar la
   * vigente anterior a `reemplazada`, dejar esta vigente) es común con Nutrición:
   * `confirmarValoracion` en src/common/valoraciones/confirmacion.helper.ts. Aquí solo va lo propio de TF.
   */
  confirmar(id: number, usuarioId: number): Promise<ValoracionFisioterapeutica> {
    return confirmarValoracion(this.dataSource, {
      entidad: ValoracionFisioterapeutica,
      id,
      usuarioId,
      etiqueta: ETIQUETA,
      validar: async (m, v) => {
        // BE-2b / RF-TF-02: todo ítem ACTIVO del catálogo de antecedentes personales debe haberse
        // evaluado (presente sí/no). Se calcula con los candados ya tomados, así que un upsert
        // simultáneo se serializa y aquí ya se ve.
        const activos = await m.getRepository(AntecedentePersonal).find({ where: { activo: true }, order: { id: 'ASC' } });
        const evaluados = await m
          .getRepository(ValoracionTfAntecedentePersonal)
          .find({ where: { valoracionId: id }, select: { id: true, antecedenteId: true } });
        const pendientes = antecedentesPersonalesPendientes(
          activos,
          evaluados.map((e) => e.antecedenteId),
        );
        return {
          faltantes: [...camposFaltantesParaConfirmar(v), ...pendientes.map((p) => `antecedentePersonal:${p.id}`)],
          extras: { antecedentesPersonalesPendientes: pendientes.map((p) => ({ id: p.id, nombre: p.nombre })) },
        };
      },
    });
  }

  async anular(id: number, motivo: string, usuarioId: number): Promise<ValoracionFisioterapeutica> {
    return this.dataSource.transaction('READ COMMITTED', async (m) => {
      const v = await bloquearValoracion(m, ValoracionFisioterapeutica, id, ETIQUETA);
      anularRegistro(v, motivo, usuarioId, 'La valoración ya está anulada');
      return m.getRepository(ValoracionFisioterapeutica).save(v);
    });
  }

  // ───────────────────────── helpers ─────────────────────────

  /**
   * Coherencia del estado final + (opcional) fecha válida y no futura. La fecha
   * solo se revisa cuando se acaba de enviar (crear/editar), no al re-guardar una histórica.
   */
  private exigirDatosValidos(estadoFinal: Parameters<typeof validarCoherencia>[0], revisarFecha: boolean): void {
    const errores: string[] = [];
    if (revisarFecha) {
      const e = errorDeFecha(estadoFinal.fecha ?? '', hoyCostaRica());
      if (e) errores.push(e);
    }
    errores.push(...validarCoherencia(estadoFinal));
    if (errores.length) throw new BadRequestException({ message: 'Datos inconsistentes', errores });
  }
}
