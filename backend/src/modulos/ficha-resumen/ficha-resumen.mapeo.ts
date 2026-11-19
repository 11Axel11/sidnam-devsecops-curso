import { BloqueFicha, FichaResumenDto, UltimaValoracion } from './ficha-resumen.dto';

/**
 * Mapeo PURO (sin base de datos) de las filas leídas a la ficha. Recibe filas que pueden traer MÁS columnas de las
 * necesarias y copia a mano SOLO los campos de la lista blanca (`ficha-resumen.dto.ts`); jamás esparce una fila.
 */

/** Textos de los motivos (contrato estable para el frontend). */
export const MOTIVOS = {
  sinBarthel: 'No hay evaluaciones de Barthel registradas',
  sinNutricionVigente: 'No hay una valoración nutricional vigente',
  sinTerapiaFisicaVigente: 'No hay una valoración fisioterapéutica vigente',
  sinDatoFuncional: 'La valoración nutricional vigente no registra la condición de movilidad',
  sinEventoCaida: 'No hay eventos de caída registrados',
  enElaboracion: 'Hay una valoración en elaboración, aún sin confirmar',
  sinValoraciones: 'No hay valoraciones registradas',
} as const;

const con = <T>(datos: T): BloqueFicha<T> => ({ datos, motivo: null });
const sin = <T>(motivo: string): BloqueFicha<T> => ({ datos: null, motivo });
const hayTexto = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

export interface FilaBarthel {
  gradoDependencia: string;
  fecha: string;
}
export interface FilaNutricionVigente {
  alergiaMedicamentos: boolean;
  detalleAlergiaMedicamentos?: string | null;
  datoFuncional?: { nombre: string } | null;
}
export interface FilaTerapiaFisicaVigente {
  antecedentesCaidas: boolean;
  usoAyudasBiomecanicas: boolean;
  detalleAyudasBiomecanicas?: string | null;
}
export interface FilaValoracion {
  fecha: string;
  estado: string;
}

export function mapearDependencia(fila: FilaBarthel | null) {
  return fila ? con({ grado: fila.gradoDependencia, fecha: fila.fecha }) : sin<{ grado: string; fecha: string }>(MOTIVOS.sinBarthel);
}

export function mapearMovilidad(vigente: FilaNutricionVigente | null) {
  if (!vigente) return sin<{ condicion: string }>(MOTIVOS.sinNutricionVigente);
  const nombre = vigente.datoFuncional?.nombre;
  return hayTexto(nombre) ? con({ condicion: nombre }) : sin<{ condicion: string }>(MOTIVOS.sinDatoFuncional);
}

export function mapearAlergiaMedicamentos(vigente: FilaNutricionVigente | null) {
  if (!vigente) return sin<{ presenta: boolean; cuales: string | null }>(MOTIVOS.sinNutricionVigente);
  const presenta = vigente.alergiaMedicamentos === true;
  return con({ presenta, cuales: presenta && hayTexto(vigente.detalleAlergiaMedicamentos) ? vigente.detalleAlergiaMedicamentos : null });
}

export function mapearAyudas(vigente: FilaTerapiaFisicaVigente | null) {
  if (!vigente) return sin<{ usa: boolean; cuales: string | null }>(MOTIVOS.sinTerapiaFisicaVigente);
  const usa = vigente.usoAyudasBiomecanicas === true;
  return con({ usa, cuales: usa && hayTexto(vigente.detalleAyudasBiomecanicas) ? vigente.detalleAyudasBiomecanicas : null });
}

export function mapearAntecedentesCaidas(vigente: FilaTerapiaFisicaVigente | null) {
  return vigente ? con({ presenta: vigente.antecedentesCaidas === true }) : sin<{ presenta: boolean }>(MOTIVOS.sinTerapiaFisicaVigente);
}

export function mapearUltimoEventoCaida(evento: { fechaHora: Date } | null) {
  return evento ? con({ fechaHora: evento.fechaHora }) : sin<{ fechaHora: Date }>(MOTIVOS.sinEventoCaida);
}

/**
 * Última valoración de un departamento: la VIGENTE; si no hay, la más reciente confirmada no anulada (`reemplazada`). Un
 * borrador NO cuenta como valoración realizada: si lo único que hay es un borrador, `datos` es null con el motivo
 * «Hay una valoración en elaboración…» y NO se expone su fecha ni su estado.
 */
export function mapearUltimaValoracion(p: {
  vigente: FilaValoracion | null;
  masRecienteConfirmada: FilaValoracion | null;
  hayBorrador: boolean;
}): BloqueFicha<UltimaValoracion> {
  const fila = p.vigente ?? p.masRecienteConfirmada;
  if (fila) return con({ fecha: fila.fecha, estado: p.vigente ? 'vigente' : 'reemplazada' });
  return sin(p.hayBorrador ? MOTIVOS.enElaboracion : MOTIVOS.sinValoraciones);
}

export function armarFicha(expedienteId: number, f: {
  barthel: FilaBarthel | null;
  nutricionVigente: FilaNutricionVigente | null;
  terapiaFisicaVigente: FilaTerapiaFisicaVigente | null;
  eventoCaida: { fechaHora: Date } | null;
  ultimaTerapiaFisica: Parameters<typeof mapearUltimaValoracion>[0];
  ultimaNutricion: Parameters<typeof mapearUltimaValoracion>[0];
}): FichaResumenDto {
  return {
    expedienteId,
    dependenciaBarthel: mapearDependencia(f.barthel),
    condicionMovilidad: mapearMovilidad(f.nutricionVigente),
    ayudasBiomecanicas: mapearAyudas(f.terapiaFisicaVigente),
    antecedentesCaidas: mapearAntecedentesCaidas(f.terapiaFisicaVigente),
    ultimoEventoCaida: mapearUltimoEventoCaida(f.eventoCaida),
    alergiaMedicamentos: mapearAlergiaMedicamentos(f.nutricionVigente),
    ultimaValoracionTerapiaFisica: mapearUltimaValoracion(f.ultimaTerapiaFisica),
    ultimaValoracionNutricion: mapearUltimaValoracion(f.ultimaNutricion),
  };
}
