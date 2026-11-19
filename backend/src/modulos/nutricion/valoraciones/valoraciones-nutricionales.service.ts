import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { aplicarAuditoriaCreacion, aplicarAuditoriaModificacion } from 'src/common/auditoria/auditoria.helper';
import { EstadoValoracion } from 'src/common/enums/estadoValoracion.enum';
import { hoyCostaRica } from 'src/common/utils/hoyCostaRica';
import { sinIndefinidos } from 'src/common/utils/sinIndefinidos';
import { anularRegistro } from 'src/common/valoraciones/anulacion.helper';
import { confirmarValoracion } from 'src/common/valoraciones/confirmacion.helper';
import { errorDeFecha } from 'src/common/valoraciones/fecha.helper';
import {
  bloquearValoracion,
  bloquearValoracionEscribible,
  exigirEditable,
  exigirExpediente,
  exigirExpedienteEscribible,
} from 'src/common/valoraciones/valoracion-lock.helper';
import { DatoFuncionalNutricion } from 'src/modulos/catalogos/entities/catalogos.entities';
import { ValoracionNutricional } from '../entities/valoracion-nutricional.entity';
import {
  ActualizarValoracionNutricionalDto,
  CrearValoracionNutricionalDto,
} from './dto/valoracion-nutricional.dto';
import { aDetalle, ValoracionNutricionalDetalle } from './nutricion.lectura';
import { camposFaltantesParaConfirmar, validarCoherencia } from './valoracion-nutricional.reglas';

const ETIQUETA = 'Valoración nutricional';

/**
 * Valoración nutricional (B.1.11 / RF-NU-04) con la misma máquina de estados RN-03 que la valoración
 * fisioterapéutica:
 *
 *   POST                → crea en `borrador` (guardado parcial).
 *   PATCH :id           → edita SOLO en borrador (bloquea la fila de la valoración).
 *   PATCH :id/confirmar → `confirmarValoracion` (helper común): candado del expediente, desplaza la
 *                         vigente anterior a `reemplazada` y deja esta vigente, en una transacción.
 *   PATCH :id/anular    → anulado = true (RN-02), con motivo; nunca DELETE.
 *
 * INVARIANTE: a lo sumo UNA valoración `vigente` NO anulada por expediente (ver confirmacion.helper.ts).
 *
 * Dato funcional (catálogo administrable): un ítem inexistente o INACTIVO se rechaza al ASIGNARLO
 * (crear, o PATCH si el valor cambia); uno desactivado después no impide corregir la valoración y
 * se sigue resolviendo en las lecturas históricas.
 */
@Injectable()
export class ValoracionesNutricionalesService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  // ───────────────────────── lecturas ─────────────────────────

  /** Historial completo (incluye reemplazadas y anuladas), de la más reciente a la más antigua. Solo cabeceras. */
  async listar(expedienteId: number): Promise<ValoracionNutricional[]> {
    await exigirExpediente(this.dataSource.manager, expedienteId);
    return this.dataSource.getRepository(ValoracionNutricional).find({
      where: { expedienteId },
      order: { fecha: 'DESC', id: 'DESC' },
    });
  }

  /** Solo la vigente, con el dato funcional resuelto. 404 si el expediente no tiene ninguna (todavía) confirmada. */
  async obtenerVigente(expedienteId: number): Promise<ValoracionNutricionalDetalle> {
    const m = this.dataSource.manager;
    await exigirExpediente(m, expedienteId);
    const vigente = await m.getRepository(ValoracionNutricional).findOne({
      where: { expedienteId, estado: EstadoValoracion.VIGENTE, anulado: false },
      relations: { datoFuncional: true },
    });
    if (!vigente) {
      throw new NotFoundException(`El expediente ${expedienteId} no tiene una valoración nutricional vigente`);
    }
    return aDetalle(vigente);
  }

  /** Detalle de una valoración (cualquier estado) con el dato funcional resuelto. */
  async obtenerDetalle(id: number): Promise<ValoracionNutricionalDetalle> {
    const v = await this.dataSource
      .getRepository(ValoracionNutricional)
      .findOne({ where: { id }, relations: { datoFuncional: true } });
    if (!v) throw new NotFoundException(`${ETIQUETA} ${id} no existe`);
    return aDetalle(v);
  }

  // ───────────────────────── escrituras ─────────────────────────

  async crear(expedienteId: number, dto: CrearValoracionNutricionalDto, usuarioId: number): Promise<ValoracionNutricional> {
    const repo = this.dataSource.getRepository(ValoracionNutricional);
    // RN-01: el expediente debe existir (404) y estar activo (409 EXPEDIENTE_INACTIVO); nunca se crea implícitamente.
    await exigirExpedienteEscribible(this.dataSource.manager, expedienteId);

    const datos = { ...sinIndefinidos(dto), fecha: dto.fecha ?? hoyCostaRica() } as Partial<ValoracionNutricional> & { fecha: string };
    await this.exigirDatosValidos(this.dataSource.manager, datos, { revisarFecha: true, datoFuncionalNuevo: datos.datoFuncionalId });

    const nueva = repo.create({
      ...datos,
      expedienteId,
      estado: EstadoValoracion.BORRADOR,
      usuarioResponsableId: usuarioId, // siempre el usuario autenticado, nunca el body
    });
    aplicarAuditoriaCreacion(nueva, usuarioId);
    return repo.save(nueva);
  }

  async actualizar(id: number, dto: ActualizarValoracionNutricionalDto, usuarioId: number): Promise<ValoracionNutricional> {
    return this.dataSource.transaction('READ COMMITTED', async (m) => {
      const v = await bloquearValoracionEscribible(m, ValoracionNutricional, id, ETIQUETA);
      exigirEditable(v);

      const cambios = sinIndefinidos(dto);
      if (cambios.fecha === null) delete cambios.fecha; // la fecha no se puede vaciar
      // El dato funcional solo se exige activo si CAMBIA a un valor nuevo (limpiarlo con null está permitido).
      const datoFuncionalNuevo =
        cambios.datoFuncionalId !== undefined && cambios.datoFuncionalId !== v.datoFuncionalId
          ? (cambios.datoFuncionalId as number | null)
          : undefined;
      Object.assign(v, cambios);
      await this.exigirDatosValidos(m, v, { revisarFecha: cambios.fecha !== undefined, datoFuncionalNuevo });

      aplicarAuditoriaModificacion(v, usuarioId);
      return m.getRepository(ValoracionNutricional).save(v);
    });
  }

  /**
   * borrador → vigente. La mecánica es común con Terapia Física (`confirmarValoracion`); aquí solo va
   * lo propio de Nutrición: los campos obligatorios (§ reglas).
   */
  confirmar(id: number, usuarioId: number): Promise<ValoracionNutricional> {
    return confirmarValoracion(this.dataSource, {
      entidad: ValoracionNutricional,
      id,
      usuarioId,
      etiqueta: ETIQUETA,
      validar: (_m, v) => Promise.resolve({ faltantes: camposFaltantesParaConfirmar(v) }),
    });
  }

  async anular(id: number, motivo: string, usuarioId: number): Promise<ValoracionNutricional> {
    return this.dataSource.transaction('READ COMMITTED', async (m) => {
      const v = await bloquearValoracion(m, ValoracionNutricional, id, ETIQUETA);
      anularRegistro(v, motivo, usuarioId, 'La valoración nutricional ya está anulada');
      return m.getRepository(ValoracionNutricional).save(v);
    });
  }

  // ───────────────────────── helpers ─────────────────────────

  /**
   * Coherencia del estado final + (opcional) fecha válida y no futura + dato funcional asignable.
   * Junta TODOS los problemas en un único `400 { errores }`. La fecha solo se revisa cuando se acaba de
   * enviar (crear/editar), no al re-guardar una histórica.
   */
  private async exigirDatosValidos(
    m: EntityManager,
    estadoFinal: Partial<ValoracionNutricional>,
    opciones: { revisarFecha: boolean; datoFuncionalNuevo?: number | null },
  ): Promise<void> {
    const errores: string[] = [];
    if (opciones.revisarFecha) {
      const e = errorDeFecha(estadoFinal.fecha ?? '', hoyCostaRica());
      if (e) errores.push(e);
    }
    errores.push(...validarCoherencia(estadoFinal));

    const id = opciones.datoFuncionalNuevo;
    if (id !== undefined && id !== null) {
      const dato = await m.getRepository(DatoFuncionalNutricion).findOne({ where: { id } });
      if (!dato) errores.push(`datoFuncionalId ${id} no existe en el catálogo`);
      else if (!dato.activo) errores.push(`datoFuncionalId ${id} ("${dato.nombre}") está desactivado`);
    }

    if (errores.length) throw new BadRequestException({ message: 'Datos inconsistentes', errores });
  }
}
