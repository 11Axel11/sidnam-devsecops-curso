import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In } from 'typeorm';
import { aplicarAuditoriaCreacion, aplicarAuditoriaModificacion } from 'src/common/auditoria/auditoria.helper';
import { sinIndefinidos } from 'src/common/utils/sinIndefinidos';
import { anularRegistro } from 'src/common/valoraciones/anulacion.helper';
import { bloquearValoracion, bloquearValoracionEscribible, exigirEditable } from 'src/common/valoraciones/valoracion-lock.helper';
import { AntecedentePersonal, TipoAntecedenteTraumatico } from 'src/modulos/catalogos/entities/catalogos.entities';
import { AntecedenteTraumatico } from '../entities/antecedente-traumatico.entity';
import { ValoracionFisioterapeutica } from '../entities/valoracion-fisioterapeutica.entity';
import { ValoracionTfAntecedentePersonal } from '../entities/valoracion-tf-antecedente-personal.entity';
import {
  AntecedentePersonalDetalle,
  AntecedenteTraumaticoDetalle,
  listarPersonales,
  obtenerTraumaticoDetalle,
} from './antecedentes.lectura';
import { errorDescripcionOtro } from './antecedentes.reglas';
import {
  ActualizarAntecedenteTraumaticoDto,
  CrearAntecedenteTraumaticoDto,
  RegistrarAntecedentesPersonalesDto,
} from './dto/antecedentes.dto';

const ETIQUETA = 'Valoración fisioterapéutica';
const ACCION_HIJOS = 'modificar los antecedentes de';

/**
 * Registros hijos de la valoración fisioterapéutica (B.1.4): antecedentes
 * personales (upsert por ítem del catálogo) y antecedentes traumáticos
 * (registros independientes 0..N, que se corrigen con PATCH y se retiran con
 * `anular`, nunca DELETE).
 *
 * REGLA (convenciones BE-2a): los hijos solo se escriben mientras la valoración
 * es borrador (409 si no) y TODA escritura bloquea la fila de la valoración
 * (`bloquearValoracion`, FOR UPDATE) antes de comprobar el estado. Así:
 *  - una escritura que llega mientras otra transacción confirma espera a que
 *    termine, ve la valoración ya vigente y recibe 409 (no se escribe un hijo
 *    sobre una valoración cerrada);
 *  - una confirmación que llega a mitad de una escritura espera, y al calcular
 *    los pendientes ya ve las filas escritas.
 * Orden de candados: expediente → valoración (aquí solo se toma el de la valoración).
 */
@Injectable()
export class AntecedentesValoracionService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  // ───────────────────────── antecedentes personales ─────────────────────────

  /**
   * Upsert por (valoracionId, antecedenteId). Acepta cualquier cantidad de
   * ítems ACTIVOS del catálogo (sin asumir cuántos hay). Todo o nada: si algún
   * ítem no existe o está desactivado, 400 y no se guarda ninguno. Idempotente:
   * reenviar lo mismo no toca ninguna fila (ni su auditoría).
   */
  async registrarPersonales(
    valoracionId: number,
    dto: RegistrarAntecedentesPersonalesDto,
    usuarioId: number,
  ): Promise<AntecedentePersonalDetalle[]> {
    return this.dataSource.transaction('READ COMMITTED', async (m) => {
      const v = await bloquearValoracionEscribible(m, ValoracionFisioterapeutica, valoracionId, ETIQUETA);
      exigirEditable(v, 'registrar antecedentes en');

      const ids = dto.antecedentes.map((a) => a.antecedenteId);
      const catalogo = await m.getRepository(AntecedentePersonal).find({ where: { id: In(ids) } });
      const porId = new Map(catalogo.map((c) => [c.id, c]));
      const errores: string[] = [];
      for (const id of ids) {
        const c = porId.get(id);
        if (!c) errores.push(`antecedenteId ${id} no existe en el catálogo`);
        else if (!c.activo) errores.push(`antecedenteId ${id} ("${c.nombre}") está desactivado`);
      }
      if (errores.length) throw new BadRequestException({ message: 'Datos inconsistentes', errores });

      const repo = m.getRepository(ValoracionTfAntecedentePersonal);
      const existentes = await repo.find({ where: { valoracionId, antecedenteId: In(ids) } });
      const actual = new Map(existentes.map((e) => [e.antecedenteId, e]));

      const aGuardar: ValoracionTfAntecedentePersonal[] = [];
      for (const item of dto.antecedentes) {
        const observacion = item.observacion?.trim() || null;
        const fila = actual.get(item.antecedenteId);
        if (!fila) {
          const nueva = repo.create({
            valoracionId,
            antecedenteId: item.antecedenteId,
            presente: item.presente,
            observacion,
          });
          aplicarAuditoriaCreacion(nueva, usuarioId);
          aGuardar.push(nueva);
        } else if (fila.presente !== item.presente || (fila.observacion ?? null) !== observacion) {
          fila.presente = item.presente;
          fila.observacion = observacion;
          aplicarAuditoriaModificacion(fila, usuarioId);
          aGuardar.push(fila);
        }
      }
      if (aGuardar.length) await repo.save(aGuardar);

      return listarPersonales(m, valoracionId);
    });
  }

  // ───────────────────────── antecedentes traumáticos ─────────────────────────

  async crearTraumatico(
    valoracionId: number,
    dto: CrearAntecedenteTraumaticoDto,
    usuarioId: number,
  ): Promise<AntecedenteTraumaticoDetalle> {
    return this.dataSource.transaction('READ COMMITTED', async (m) => {
      const v = await bloquearValoracionEscribible(m, ValoracionFisioterapeutica, valoracionId, ETIQUETA);
      exigirEditable(v, ACCION_HIJOS);

      const tipo = await this.tipoValido(m, dto.tipoId, true);
      this.exigirDescripcion(tipo, dto.descripcion);

      const repo = m.getRepository(AntecedenteTraumatico);
      const nuevo = repo.create({
        valoracionId,
        tipoId: dto.tipoId,
        descripcion: dto.descripcion ?? null,
        localizacionAnatomica: dto.localizacionAnatomica ?? null,
        tiempoTranscurrido: dto.tiempoTranscurrido ?? null,
      });
      aplicarAuditoriaCreacion(nuevo, usuarioId);
      const guardado = await repo.save(nuevo);
      return this.detalle(m, guardado.id);
    });
  }

  async actualizarTraumatico(
    id: number,
    dto: ActualizarAntecedenteTraumaticoDto,
    usuarioId: number,
  ): Promise<AntecedenteTraumaticoDetalle> {
    return this.dataSource.transaction('READ COMMITTED', async (m) => {
      const at = await this.bloquearPorTraumatico(m, id);

      const cambios = sinIndefinidos(dto);
      if (cambios.tipoId === null) delete cambios.tipoId; // el tipo es obligatorio: no se puede vaciar (el DTO ya lo rechaza con 400; defensa para llamadas directas)
      // Un tipo desactivado DESPUÉS de crear el registro no impide corregir sus otros campos;
      // solo se exige activo si el tipo cambia.
      const cambiaTipo = cambios.tipoId !== undefined && cambios.tipoId !== at.tipoId;
      const tipo = await this.tipoValido(m, (cambios.tipoId as number | undefined) ?? at.tipoId, cambiaTipo);
      const descripcionFinal = cambios.descripcion !== undefined ? (cambios.descripcion as string | null) : at.descripcion;
      this.exigirDescripcion(tipo, descripcionFinal);

      Object.assign(at, cambios);
      aplicarAuditoriaModificacion(at, usuarioId);
      await m.getRepository(AntecedenteTraumatico).save(at);
      return this.detalle(m, at.id);
    });
  }

  /** Retira el registro sin DELETE: `anulado = true` con motivo, usuario y fecha. */
  async anularTraumatico(id: number, motivo: string, usuarioId: number): Promise<AntecedenteTraumaticoDetalle> {
    return this.dataSource.transaction('READ COMMITTED', async (m) => {
      const at = await this.bloquearPorTraumatico(m, id, false);
      anularRegistro(at, motivo, usuarioId, 'El antecedente traumático ya está anulado');
      await m.getRepository(AntecedenteTraumatico).save(at);
      return this.detalle(m, at.id);
    });
  }

  // ───────────────────────── helpers ─────────────────────────

  /**
   * Para las rutas planas `/antecedentes-traumaticos/:id`: se lee el hijo para
   * conocer su valoración, se BLOQUEA la valoración, se comprueba que sea un
   * borrador y se re-lee el hijo ya con el candado tomado (otra transacción
   * pudo cambiarlo mientras esperábamos). `exigirNoAnulado` impide editar uno retirado.
   */
  private async bloquearPorTraumatico(m: EntityManager, id: number, exigirNoAnulado = true): Promise<AntecedenteTraumatico> {
    const repo = m.getRepository(AntecedenteTraumatico);
    const previo = await repo.findOne({ where: { id }, select: { id: true, valoracionId: true } });
    if (!previo) throw new NotFoundException(`Antecedente traumático ${id} no existe`);

    // Editar contenido (`exigirNoAnulado`) exige expediente activo; ANULAR el traumático sigue permitido en uno inactivo.
    const v = exigirNoAnulado
      ? await bloquearValoracionEscribible(m, ValoracionFisioterapeutica, previo.valoracionId, ETIQUETA)
      : await bloquearValoracion(m, ValoracionFisioterapeutica, previo.valoracionId, ETIQUETA);
    exigirEditable(v, ACCION_HIJOS);

    const at = await repo.findOne({ where: { id } });
    if (!at) throw new NotFoundException(`Antecedente traumático ${id} no existe`);
    if (exigirNoAnulado && at.anulado) {
      throw new ConflictException('El antecedente traumático está anulado y no se puede modificar');
    }
    return at;
  }

  /** Tipo del catálogo o 400. `exigirActivo` solo al crear o al cambiar el tipo. */
  private async tipoValido(m: EntityManager, tipoId: number, exigirActivo: boolean): Promise<TipoAntecedenteTraumatico> {
    const tipo = await m.getRepository(TipoAntecedenteTraumatico).findOne({ where: { id: tipoId } });
    if (!tipo) throw new BadRequestException({ message: 'Datos inconsistentes', errores: [`tipoId ${tipoId} no existe en el catálogo`] });
    if (exigirActivo && !tipo.activo) {
      throw new BadRequestException({
        message: 'Datos inconsistentes',
        errores: [`tipoId ${tipoId} ("${tipo.nombre}") está desactivado`],
      });
    }
    return tipo;
  }

  /** RF-TF-03: la descripción es obligatoria cuando el tipo es «Otro». */
  private exigirDescripcion(tipo: TipoAntecedenteTraumatico, descripcion: string | null | undefined): void {
    const error = errorDescripcionOtro(tipo.nombre, descripcion);
    if (error) throw new BadRequestException({ message: 'Datos inconsistentes', errores: [error] });
  }

  private async detalle(m: EntityManager, id: number): Promise<AntecedenteTraumaticoDetalle> {
    const d = await obtenerTraumaticoDetalle(m, id);
    if (!d) throw new NotFoundException(`Antecedente traumático ${id} no existe`);
    return d;
  }
}
