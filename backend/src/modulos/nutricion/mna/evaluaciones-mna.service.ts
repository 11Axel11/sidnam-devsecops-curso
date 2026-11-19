import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Between, DataSource, EntityManager, FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { aplicarAuditoriaCreacion } from 'src/common/auditoria/auditoria.helper';
import { ListarRegistrosDto } from 'src/common/dto/listar-registros.dto';
import { hoyCostaRica } from 'src/common/utils/hoyCostaRica';
import { anularRegistroPorId } from 'src/common/valoraciones/anulacion.helper';
import { errorDeFecha, erroresDeRango } from 'src/common/valoraciones/fecha.helper';
import { exigirExpediente, exigirExpedienteEscribible } from 'src/common/valoraciones/valoracion-lock.helper';
import { ControlNutricional } from '../entities/control-nutricional.entity';
import { EvaluacionMna } from '../entities/evaluacion-mna.entity';
import { calcularMna, ItemsMna, ResultadoMna } from './calcular-mna';
import { CrearEvaluacionMnaDto } from './dto/evaluacion-mna.dto';
import { CAMPOS_EVALUACION, CampoEvaluacion, VERSION_MNA } from './mna-v1.instrumento';
import {
  erroresDeControlVinculado,
  erroresDeSegundaParte,
  EstadoSegundaParte,
  estadoSegundaParte,
  ItemResuelto,
  MOTIVO_SIN_VINCULO,
  resolverItemF,
  resolverItemQ,
  resolverItemR,
} from './mna.reglas';

const ETIQUETA = 'Evaluación MNA';

/**
 * Vista previa para la pantalla (`POST …/calcular`): no guarda nada; el valor oficial es el que devuelve el registro.
 * Siempre trae el cribaje; `subtotalEvaluacion`, `evaluacionGlobal` e `interpretacionGlobal` solo van con valor si
 * G–R está completa (si no, `null`). La situación de la segunda parte se informa aparte y NO es un error.
 */
export interface VistaPreviaMna extends ResultadoMna {
  versionInstrumento: string;
  /** Ítem F efectivo (derivado del control vinculado, o el manual). */
  itemF: number;
  segundaParte: EstadoSegundaParte;
  /**
   * ADITIVO: de dónde sale cada ítem derivable (F, Q y R). Con control vinculado que trae la medida, el ítem viene con
   * `origen: 'control'` y `soloLectura: true` (con su `medida` y, en Q y R, `medidaRedondeada`) AUNQUE todavía no se haya
   * enviado ningún ítem de G–P, para que la pantalla lo muestre desde el primer momento. Si no, `origen: 'manual'`.
   */
  itemsOrigen: { itemF: ItemResuelto; itemQ: ItemResuelto; itemR: ItemResuelto };
}

interface Preparada {
  fecha: string;
  controlNutricionalId: number | null;
  items: ItemsMna;
  resultado: ResultadoMna;
  segundaParte: EstadoSegundaParte;
  itemsOrigen: VistaPreviaMna['itemsOrigen'];
}

/**
 * Mini Nutritional Assessment (B.1.10 / RF-NU-03): serie de evaluaciones por expediente SIN máquina de estados. No
 * hay edición ni DELETE: un error se corrige anulando (con motivo) y registrando otra.
 *
 * `crear` y `calcular` (vista previa) comparten `preparar`: las mismas validaciones y las mismas funciones puras
 * (`calcularMna`, `resolverItemF`, `erroresDeSegundaParte`, `erroresDeControlVinculado`); lo único que cambia es que
 * el registro corre en una transacción, toma el candado de la fila del control y guarda. El examinador (responsable)
 * es el usuario autenticado. Expediente `Inactivo`: el registro responde 409 `EXPEDIENTE_INACTIVO`; la vista previa, el listado y la
 * anulación siguen disponibles.
 *
 * Vínculo con el control (`controlNutricionalId`, opcional, 1 a 1 del ERD): mismo expediente, no anulado y no
 * posterior a la fecha de la evaluación (400); a lo sumo UNA evaluación no anulada por control (409), garantizada con
 * el candado `FOR UPDATE` de la fila del control (sin UNIQUE en la base: ver la entidad).
 */
@Injectable()
export class EvaluacionesMnaService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** Más reciente primero. Por defecto excluye las anuladas (`incluirAnulados`). */
  async listar(expedienteId: number, filtros: ListarRegistrosDto): Promise<EvaluacionMna[]> {
    const m = this.dataSource.manager;
    await exigirExpediente(m, expedienteId);
    const errores = erroresDeRango(filtros.desde, filtros.hasta);
    if (errores.length) throw new BadRequestException({ message: 'Datos inconsistentes', errores });

    const where: FindOptionsWhere<EvaluacionMna> = { expedienteId };
    if (!filtros.incluirAnulados) where.anulado = false;
    if (filtros.desde !== undefined && filtros.hasta !== undefined) where.fecha = Between(filtros.desde, filtros.hasta);
    else if (filtros.desde !== undefined) where.fecha = MoreThanOrEqual(filtros.desde);
    else if (filtros.hasta !== undefined) where.fecha = LessThanOrEqual(filtros.hasta);

    return m.getRepository(EvaluacionMna).find({ where, order: { fecha: 'DESC', id: 'DESC' } });
  }

  /**
   * Vista previa SIN persistir y SIN candados. Mismos errores que el registro (formato, fecha, vínculo, ítem F, 409 del
   * control ya vinculado) EXCEPTO la regla de la segunda parte: aquí no se rechaza, se informa en `segundaParte`.
   */
  async calcular(expedienteId: number, dto: CrearEvaluacionMnaDto): Promise<VistaPreviaMna> {
    const p = await this.preparar(this.dataSource.manager, expedienteId, dto, { bloquear: false, exigirSegundaParte: false, exigirExpedienteActivo: false });
    return { ...p.resultado, versionInstrumento: VERSION_MNA, itemF: p.items.itemF, segundaParte: p.segundaParte, itemsOrigen: p.itemsOrigen };
  }

  async crear(expedienteId: number, dto: CrearEvaluacionMnaDto, usuarioId: number): Promise<EvaluacionMna> {
    return this.dataSource.transaction('READ COMMITTED', async (m) => {
      const p = await this.preparar(m, expedienteId, dto, { bloquear: true, exigirSegundaParte: true, exigirExpedienteActivo: true });
      const repo = m.getRepository(EvaluacionMna);
      const evaluacion = Object.fromEntries(CAMPOS_EVALUACION.map((c) => [c, p.items[c] ?? null])) as Record<CampoEvaluacion, number | null>;
      const nueva = repo.create({
        expedienteId,
        fecha: p.fecha,
        usuarioResponsableId: usuarioId, // siempre el usuario autenticado, nunca el body
        controlNutricionalId: p.controlNutricionalId,
        itemA: p.items.itemA,
        itemB: p.items.itemB,
        itemC: p.items.itemC,
        itemD: p.items.itemD,
        itemE: p.items.itemE,
        itemF: p.items.itemF,
        ...evaluacion,
        ...p.resultado,
        versionInstrumento: VERSION_MNA,
      });
      aplicarAuditoriaCreacion(nueva, usuarioId);
      return repo.save(nueva);
    });
  }

  /** RN-02: nunca se borra; `anulado = true` con motivo, usuario y fecha. 404 si no existe, 409 si ya estaba anulada. */
  anular(id: number, motivo: string, usuarioId: number): Promise<EvaluacionMna> {
    return anularRegistroPorId(this.dataSource, {
      entidad: EvaluacionMna,
      id,
      motivo,
      usuarioId,
      etiqueta: ETIQUETA,
      mensajeYaAnulado: 'La evaluación MNA ya está anulada',
    });
  }

  /**
   * Validaciones y cálculo comunes al registro y a la vista previa. `bloquear` toma `FOR UPDATE` de la fila del
   * control (solo el registro, dentro de su transacción). `exigirSegundaParte` aplica la regla de G–R (solo el
   * registro: la vista previa la informa sin rechazarla). Orden: 404 del expediente → 400 `errores` (fecha, vínculo,
   * ítem F y, en el registro, segunda parte; todos juntos cuando se pueden evaluar) → 409 si el control ya está vinculado.
   */
  private async preparar(
    m: EntityManager,
    expedienteId: number,
    dto: CrearEvaluacionMnaDto,
    { bloquear, exigirSegundaParte, exigirExpedienteActivo }: { bloquear: boolean; exigirSegundaParte: boolean; exigirExpedienteActivo: boolean },
  ): Promise<Preparada> {
    // RN-01: el expediente debe existir (404); el REGISTRO exige además que esté activo (409 EXPEDIENTE_INACTIVO), la vista previa no
    // (no persiste nada).
    if (exigirExpedienteActivo) await exigirExpedienteEscribible(m, expedienteId);
    else await exigirExpediente(m, expedienteId);

    const hoy = hoyCostaRica();
    const fecha = dto.fecha ?? hoy;
    const errores: string[] = [];
    const errorFecha = errorDeFecha(fecha, hoy, 'de la evaluación');
    if (errorFecha) errores.push(errorFecha);

    // ── vínculo con el control ──
    const controlId = dto.controlNutricionalId ?? null;
    let control: ControlNutricional | null = null;
    let imcControl: number | null = null;
    let cbControl: number | null = null;
    let cpControl: number | null = null;
    if (controlId !== null) {
      control = await m.getRepository(ControlNutricional).findOne({
        where: { id: controlId },
        ...(bloquear ? { lock: { mode: 'pessimistic_write' as const } } : {}),
      });
      const erroresVinculo = erroresDeControlVinculado(control, { controlId, expedienteId, fechaEvaluacion: fecha });
      errores.push(...erroresVinculo);
      if (!erroresVinculo.length && control) {
        imcControl = control.imc;
        cbControl = control.circunferenciaBraquial ?? null;
        cpControl = control.circunferenciaPantorrilla ?? null;
      }
    }

    // ── ítems F, Q y R (derivados del control si trae la medida), cribaje y segunda parte ──
    // Solo si el vínculo no falló: sin los datos del control no hay ítems derivados fiables.
    const vinculoFallo = controlId !== null && imcControl === null;
    let items: ItemsMna | null = null;
    let segundaParte: EstadoSegundaParte | null = null;
    let itemsOrigen: VistaPreviaMna['itemsOrigen'] | null = null;
    if (!vinculoFallo) {
      const f = resolverItemF(dto.itemF, imcControl);
      const q = resolverItemQ(dto.itemQ, cbControl, control !== null);
      const r = resolverItemR(dto.itemR, cpControl, control !== null);
      errores.push(...f.errores, ...q.errores, ...r.errores);
      if (f.itemF !== null && !f.errores.length) {
        itemsOrigen = { itemF: itemFResuelto(f.itemF, imcControl, dto.itemF), itemQ: q.item, itemR: r.item };
        const cribaje = { itemA: dto.itemA, itemB: dto.itemB, itemC: dto.itemC, itemD: dto.itemD, itemE: dto.itemE, itemF: f.itemF };
        const enviados = Object.fromEntries(CAMPOS_EVALUACION.map((c) => [c, dto[c] ?? null])) as Partial<Record<CampoEvaluacion, number | null>>;
        // «Efectivos»: lo enviado más Q y R derivados del control (aunque no se haya enviado nada de G–P).
        const efectivos = { ...enviados, itemQ: q.item.valor, itemR: r.item.valor };
        // Lo que sigue condicionado a que la persona envíe algo de la segunda parte es GUARDARLA: si no envió ningún ítem
        // de G–R (cribaje ≥ 12) la segunda parte se omite y G–R quedan null aunque el control traiga CB/CP.
        const iniciada = CAMPOS_EVALUACION.some((c) => enviados[c] !== undefined && enviados[c] !== null);
        const subtotalCribaje = calcularMna(cribaje).subtotalCribaje;
        segundaParte = estadoSegundaParte(efectivos, subtotalCribaje);
        if (exigirSegundaParte) {
          // Con cribaje < 12 se exige completar (`itemsFaltantes` ya no lista Q/R derivados); con ≥ 12 «todo o nada» se
          // evalúa sobre lo ENVIADO, para que Q/R derivados solos no cuenten como una segunda parte a medias.
          const base = iniciada || segundaParte.requerida ? efectivos : enviados;
          errores.push(...erroresDeSegundaParte(base, subtotalCribaje));
        }
        // G–R entra al cálculo solo si está completa: `calcularMna` no admite una segunda parte a medias (la vista previa
        // la deja fuera y el registro ya la rechazó arriba).
        items = segundaParte.completa ? { ...cribaje, ...efectivos } : cribaje;
      }
    }
    if (errores.length || !items || !segundaParte || !itemsOrigen) throw new BadRequestException({ message: 'Datos inconsistentes', errores });

    // El control no puede estar ya vinculado a otra evaluación activa (1 a 1 del ERD).
    if (control) {
      const [otra] = await m.getRepository(EvaluacionMna).find({ where: { controlNutricionalId: control.id, anulado: false } });
      if (otra) throw new ConflictException(`El control nutricional ${control.id} ya está vinculado a la evaluación MNA ${otra.id}`);
    }

    return { fecha, controlNutricionalId: control ? control.id : null, items, resultado: calcularMna(items), segundaParte, itemsOrigen };
  }
}

/** Origen del ítem F para la vista previa: derivado del IMC del control, o el valor manual. */
function itemFResuelto(itemF: number, imcControl: number | null, manual: number | null | undefined): ItemResuelto {
  if (imcControl !== null) return { valor: itemF, origen: 'control', soloLectura: true, medida: imcControl };
  return { valor: manual ?? null, origen: 'manual', soloLectura: false, motivo: MOTIVO_SIN_VINCULO };
}
