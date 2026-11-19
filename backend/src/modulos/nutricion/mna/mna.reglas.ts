import { MNA_ITEM_Q_PUNTAJE } from 'src/common/constants/mna.constant';
import { CRIBAJE_SEGUNDA_PARTE_NO_NECESARIA } from './calcular-mna';
import { CampoEvaluacion, CAMPOS_EVALUACION } from './mna-v1.instrumento';

/**
 * Reglas puras del MNA que dependen de más de un campo o del control nutricional vinculado (RF-NU-03). Las
 * usan el registro (`POST`) y la vista previa (`POST …/calcular`), de modo que no hay lógica duplicada. Sin base
 * de datos: se prueban en aislamiento.
 */

/**
 * Ítem F según el IMC (Tabla 26): menor a 19 ⇒ 0 · de 19 a menos de 21 ⇒ 1 · de 21 a menos de 23 ⇒ 2 · de 23 o más ⇒ 3.
 * El IMC del control está almacenado con un decimal, así que 18,9 / 19,0, 20,9 / 21,0 y 22,9 / 23,0 son exactos.
 */
export function puntosItemFPorImc(imc: number): 0 | 1 | 2 | 3 {
  if (imc < 19) return 0;
  if (imc < 21) return 1;
  if (imc < 23) return 2;
  return 3;
}

/**
 * Resuelve el ítem F (RF-NU-03: «debe poder tomar el IMC del control nutricional», sin recálculo manual):
 *  - CON control vinculado (`imcControl` ≠ null): el valor sale del IMC del control; un `itemF` manual DISTINTO se
 *    rechaza; uno igual u omitido (ausente o `null`) se acepta.
 *  - SIN vínculo (`imcControl` = null): `itemF` es obligatorio y se toma tal cual (el formato ya lo restringe a
 *    los cuatro valores del instrumento).
 */
export function resolverItemF(
  itemFManual: number | null | undefined,
  imcControl: number | null,
): { itemF: number | null; errores: string[] } {
  const hayManual = itemFManual !== undefined && itemFManual !== null;
  if (imcControl !== null) {
    const derivado = puntosItemFPorImc(imcControl);
    if (hayManual && itemFManual !== derivado) {
      return {
        itemF: derivado,
        errores: [`itemF no coincide con el IMC del control vinculado: IMC ${imcControl} ⇒ itemF ${derivado}`],
      };
    }
    return { itemF: derivado, errores: [] };
  }
  if (!hayManual) return { itemF: null, errores: ['itemF es obligatorio cuando no se vincula un control nutricional'] };
  return { itemF: itemFManual, errores: [] };
}

// ───────────────────────── ítems Q y R derivados del control (decisión de la Jefatura, octubre 2026) ─────────────────────────

/**
 * Las medidas del control (`decimal(5,1)`) se pasan a DÉCIMAS ENTERAS antes de comparar: así no hay errores de punto
 * flotante (21,4 × 10 no se deja en 213,99…).
 */
export const enDecimas = (medida: number): number => Math.round(medida * 10);

/**
 * Redondeo al ENTERO MÁS CERCANO con el .5 hacia arriba, hecho en décimas enteras: 20,4 ⇒ 20 · 20,5 ⇒ 21 · 22,4 ⇒ 22 ·
 * 22,5 ⇒ 23 · 30,4 ⇒ 30 · 30,5 ⇒ 31.
 */
export const redondearMedidaAlEntero = (medida: number): number => Math.floor((enDecimas(medida) + 5) / 10);

/**
 * Ítem Q (circunferencia braquial, Anexo D) sobre la CB redondeada al entero: `< 21 ⇒ 0` · `21 a 22 ⇒ 0,5` ·
 * `> 22 ⇒ 1,0` (decisión P2). Cortes efectivos sobre la medida original: 0 si CB < 20,5 · 0,5 de 20,5 a < 22,5 ·
 * 1,0 desde 22,5.
 */
export function puntosItemQPorCb(cb: number): number {
  const r = redondearMedidaAlEntero(cb);
  if (r < 21) return 0;
  if (r <= 22) return 0.5;
  return MNA_ITEM_Q_PUNTAJE;
}

/**
 * Ítem R (circunferencia de la pantorrilla, Anexo D) sobre la CP redondeada al entero: `< 31 ⇒ 0` · `≥ 31 ⇒ 1`.
 * Cortes efectivos sobre la medida original: 0 si CP < 30,5 · 1 desde 30,5.
 */
export function puntosItemRPorCp(cp: number): number {
  return redondearMedidaAlEntero(cp) < 31 ? 0 : 1;
}

export type OrigenItemMna = 'control' | 'manual';

/** Cómo quedó resuelto un ítem derivable (F, Q o R): lo que la pantalla muestra de solo lectura o pide a mano. */
export interface ItemResuelto {
  /** Derivado del control, o el enviado a mano (`null` si todavía no se envió). */
  valor: number | null;
  origen: OrigenItemMna;
  /** `true` si el valor sale del control: la pantalla lo muestra sin permitir editarlo. */
  soloLectura: boolean;
  /** Medida del control de la que se derivó (IMC, CB o CP). Solo con `origen = control`. */
  medida?: number;
  /** Medida redondeada al entero más cercano (solo Q y R). */
  medidaRedondeada?: number;
  /** Por qué se pide a mano (solo con `origen = manual`). */
  motivo?: string;
}

export const MOTIVO_SIN_VINCULO = 'No hay control nutricional vinculado: el ítem se registra a mano';

interface ParametrosItemPorMedida {
  campo: 'itemQ' | 'itemR';
  manual: number | null | undefined;
  /** Medida del control; `null`/`undefined` si no la trae (son opcionales en el control). */
  medida: number | null | undefined;
  hayVinculo: boolean;
  /** «circunferencia braquial» / «circunferencia de la pantorrilla» */
  nombreMedida: string;
  siglaMedida: 'CB' | 'CP';
  campoDelControl: 'circunferenciaBraquial' | 'circunferenciaPantorrilla';
  puntos: (medida: number) => number;
}

function resolverItemPorMedida(p: ParametrosItemPorMedida): { item: ItemResuelto; errores: string[] } {
  const hayManual = p.manual !== undefined && p.manual !== null;
  if (p.medida !== null && p.medida !== undefined) {
    const derivado = p.puntos(p.medida);
    const medidaRedondeada = redondearMedidaAlEntero(p.medida);
    const item: ItemResuelto = { valor: derivado, origen: 'control', soloLectura: true, medida: p.medida, medidaRedondeada };
    if (hayManual && p.manual !== derivado) {
      return {
        item,
        errores: [`${p.campo} no coincide con la ${p.nombreMedida} del control vinculado: ${p.siglaMedida} ${p.medida} ⇒ ${medidaRedondeada} ⇒ ${p.campo} ${derivado}`],
      };
    }
    return { item, errores: [] };
  }
  const motivo = p.hayVinculo ? `El control vinculado no trae ${p.campoDelControl}: el ítem se registra a mano` : MOTIVO_SIN_VINCULO;
  return { item: { valor: hayManual ? (p.manual as number) : null, origen: 'manual', soloLectura: false, motivo }, errores: [] };
}

/**
 * Ítem Q con el control vinculado (misma idea que `resolverItemF`): si el control trae `circunferenciaBraquial` el ítem
 * se DERIVA y un valor manual distinto se rechaza (400); igual u omitido ⇒ ok. Si el control no la trae (es opcional) o no
 * hay vínculo, el ítem se pide a mano.
 */
export function resolverItemQ(manual: number | null | undefined, cbControl: number | null | undefined, hayVinculo: boolean) {
  return resolverItemPorMedida({
    campo: 'itemQ', manual, medida: cbControl, hayVinculo,
    nombreMedida: 'circunferencia braquial', siglaMedida: 'CB', campoDelControl: 'circunferenciaBraquial', puntos: puntosItemQPorCb,
  });
}

/** Ítem R con el control vinculado, a partir de `circunferenciaPantorrilla` (ver `resolverItemQ`). */
export function resolverItemR(manual: number | null | undefined, cpControl: number | null | undefined, hayVinculo: boolean) {
  return resolverItemPorMedida({
    campo: 'itemR', manual, medida: cpControl, hayVinculo,
    nombreMedida: 'circunferencia de la pantorrilla', siglaMedida: 'CP', campoDelControl: 'circunferenciaPantorrilla', puntos: puntosItemRPorCp,
  });
}

/** Situación de la segunda parte (G–R) respecto del cribaje; la informa la vista previa y la usa la regla del registro. */
export interface EstadoSegundaParte {
  /** `true` si el cribaje es menor que 12 (la segunda parte es obligatoria para registrar). */
  requerida: boolean;
  /** `true` si los doce ítems G–R vinieron. */
  completa: boolean;
  /** Campos G–R ausentes o `null`, en el orden del instrumento. */
  itemsFaltantes: CampoEvaluacion[];
}

export function estadoSegundaParte(items: Partial<Record<CampoEvaluacion, number | null>>, subtotalCribaje: number): EstadoSegundaParte {
  const itemsFaltantes = CAMPOS_EVALUACION.filter((c) => items[c] === undefined || items[c] === null);
  return {
    requerida: subtotalCribaje < CRIBAJE_SEGUNDA_PARTE_NO_NECESARIA,
    completa: itemsFaltantes.length === 0,
    itemsFaltantes,
  };
}

/**
 * Regla de la segunda parte según el cribaje (RF-NU-03 / RN-07), que aplica el REGISTRO (la vista previa solo la
 * informa con `estadoSegundaParte` y no la rechaza):
 *  - cribaje < 12 ⇒ la segunda parte (G–R) es OBLIGATORIA (la Tabla 27 dice «Continuar la evaluación»). Decisión
 *    CONFIRMADA por la Jefatura (octubre 2026).
 *  - cribaje ≥ 12 ⇒ es OPCIONAL («no es necesario continuar»): se puede omitir completa, pero no a medias.
 */
export function erroresDeSegundaParte(
  items: Partial<Record<CampoEvaluacion, number | null>>,
  subtotalCribaje: number,
): string[] {
  const { itemsFaltantes: faltan } = estadoSegundaParte(items, subtotalCribaje);
  if (faltan.length === 0) return [];
  if (subtotalCribaje < CRIBAJE_SEGUNDA_PARTE_NO_NECESARIA) {
    return [
      `La segunda parte (ítems G a R) es obligatoria cuando el subtotal de cribaje es menor que ${CRIBAJE_SEGUNDA_PARTE_NO_NECESARIA}` +
        ` (subtotal ${subtotalCribaje}): faltan ${faltan.join(', ')}`,
    ];
  }
  if (faltan.length < CAMPOS_EVALUACION.length) {
    return [`La segunda parte (ítems G a R) se envía completa o no se envía: faltan ${faltan.join(', ')}`];
  }
  return []; // cribaje ≥ 12 y segunda parte omitida: válido
}

/** Lo que se necesita saber del control nutricional a vincular. */
export interface ControlParaVincular {
  id: number;
  expedienteId: number;
  anulado: boolean;
  /** 'YYYY-MM-DD' */
  fecha: string;
  /** IMC ya almacenado (1 decimal). */
  imc: number;
}

/**
 * Validaciones del control vinculado (400): debe existir, pertenecer al MISMO expediente (RN-01), no estar anulado
 * y no ser posterior a la fecha de la evaluación (la fecha de referencia es la de la evaluación MNA). Que no esté
 * vinculado a otra evaluación activa es un 409 que decide el servicio con el candado de la fila.
 */
export function erroresDeControlVinculado(
  control: ControlParaVincular | null,
  contexto: { controlId: number; expedienteId: number; fechaEvaluacion: string },
): string[] {
  const { controlId, expedienteId, fechaEvaluacion } = contexto;
  if (!control) return [`controlNutricionalId ${controlId} no existe`];
  if (control.expedienteId !== expedienteId) return [`controlNutricionalId ${controlId} no pertenece a este expediente`];
  if (control.anulado) return [`controlNutricionalId ${controlId} está anulado`];
  if (control.fecha > fechaEvaluacion) {
    return [`controlNutricionalId ${controlId} es del ${control.fecha}, posterior a la fecha de la evaluación (${fechaEvaluacion})`];
  }
  return [];
}
