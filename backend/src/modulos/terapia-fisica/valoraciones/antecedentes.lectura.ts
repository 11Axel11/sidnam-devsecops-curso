import { EntityManager } from 'typeorm';
import { AntecedenteTraumatico } from '../entities/antecedente-traumatico.entity';
import { ValoracionFisioterapeutica } from '../entities/valoracion-fisioterapeutica.entity';
import { ValoracionTfAntecedentePersonal } from '../entities/valoracion-tf-antecedente-personal.entity';

/**
 * Lectura y mapeo de los hijos de una valoración (B.1.4). Respuestas planas y
 * estables (no se devuelven las entidades de catálogo completas): el nombre y
 * `activo` del ítem se resuelven SIEMPRE, aunque el ítem se haya desactivado
 * después (las valoraciones históricas deben seguir mostrándolo).
 */

export interface AntecedentePersonalDetalle {
  id: number;
  antecedenteId: number;
  nombre: string;
  /** Estado ACTUAL del ítem en el catálogo (puede estar desactivado en una valoración histórica). */
  activo: boolean;
  presente: boolean;
  observacion: string | null;
  creadoPorId: number | null;
  fechaCreacion: Date;
  modificadoPorId: number | null;
  fechaModificacion: Date | null;
}

export interface AntecedenteTraumaticoDetalle {
  id: number;
  valoracionId: number;
  tipoId: number;
  tipo: { id: number; nombre: string; activo: boolean };
  descripcion: string | null;
  localizacionAnatomica: string | null;
  tiempoTranscurrido: string | null;
  anulado: boolean;
  motivoAnulacion: string | null;
  anuladoPorId: number | null;
  fechaAnulacion: Date | null;
  creadoPorId: number | null;
  fechaCreacion: Date;
  modificadoPorId: number | null;
  fechaModificacion: Date | null;
}

export type ValoracionFisioterapeuticaDetalle = ValoracionFisioterapeutica & {
  antecedentesPersonales: AntecedentePersonalDetalle[];
  antecedentesTraumaticos: AntecedenteTraumaticoDetalle[];
};

export const aPersonalDetalle = (f: ValoracionTfAntecedentePersonal): AntecedentePersonalDetalle => ({
  id: f.id,
  antecedenteId: f.antecedenteId,
  nombre: f.antecedente?.nombre ?? '',
  activo: f.antecedente?.activo ?? false,
  presente: f.presente,
  observacion: f.observacion ?? null,
  creadoPorId: f.creadoPorId ?? null,
  fechaCreacion: f.fechaCreacion,
  modificadoPorId: f.modificadoPorId ?? null,
  fechaModificacion: f.fechaModificacion ?? null,
});

export const aTraumaticoDetalle = (f: AntecedenteTraumatico): AntecedenteTraumaticoDetalle => ({
  id: f.id,
  valoracionId: f.valoracionId,
  tipoId: f.tipoId,
  tipo: { id: f.tipo?.id ?? f.tipoId, nombre: f.tipo?.nombre ?? '', activo: f.tipo?.activo ?? false },
  descripcion: f.descripcion ?? null,
  localizacionAnatomica: f.localizacionAnatomica ?? null,
  tiempoTranscurrido: f.tiempoTranscurrido ?? null,
  anulado: f.anulado,
  motivoAnulacion: f.motivoAnulacion ?? null,
  anuladoPorId: f.anuladoPorId ?? null,
  fechaAnulacion: f.fechaAnulacion ?? null,
  creadoPorId: f.creadoPorId ?? null,
  fechaCreacion: f.fechaCreacion,
  modificadoPorId: f.modificadoPorId ?? null,
  fechaModificacion: f.fechaModificacion ?? null,
});

/** Todas las filas de la valoración (incluidas `presente = false`: «evaluado y descartado»). */
export async function listarPersonales(m: EntityManager, valoracionId: number): Promise<AntecedentePersonalDetalle[]> {
  const filas = await m.getRepository(ValoracionTfAntecedentePersonal).find({
    where: { valoracionId },
    relations: { antecedente: true },
    order: { antecedenteId: 'ASC' },
  });
  return filas.map(aPersonalDetalle);
}

/** Solo los NO anulados, en el orden en que se registraron. */
export async function listarTraumaticos(m: EntityManager, valoracionId: number): Promise<AntecedenteTraumaticoDetalle[]> {
  const filas = await m.getRepository(AntecedenteTraumatico).find({
    where: { valoracionId, anulado: false },
    relations: { tipo: true },
    order: { id: 'ASC' },
  });
  return filas.map(aTraumaticoDetalle);
}

/** Un traumático (anulado o no) con su tipo resuelto, para responder a POST/PATCH/anular. */
export async function obtenerTraumaticoDetalle(m: EntityManager, id: number): Promise<AntecedenteTraumaticoDetalle | null> {
  const fila = await m.getRepository(AntecedenteTraumatico).findOne({ where: { id }, relations: { tipo: true } });
  return fila ? aTraumaticoDetalle(fila) : null;
}

export async function cargarAntecedentes(
  m: EntityManager,
  valoracionId: number,
): Promise<Pick<ValoracionFisioterapeuticaDetalle, 'antecedentesPersonales' | 'antecedentesTraumaticos'>> {
  return {
    antecedentesPersonales: await listarPersonales(m, valoracionId),
    antecedentesTraumaticos: await listarTraumaticos(m, valoracionId),
  };
}
