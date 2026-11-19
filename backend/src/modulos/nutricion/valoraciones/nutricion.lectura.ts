import { ValoracionNutricional } from '../entities/valoracion-nutricional.entity';

/**
 * Lectura de la valoración nutricional con su dato funcional resuelto. El `nombre` y el `activo`
 * actuales del ítem de catálogo se resuelven SIEMPRE, aunque el ítem se haya desactivado después
 * (las valoraciones históricas deben seguir mostrándolo). El historial devuelve solo cabeceras
 * (`datoFuncionalId`), sin este objeto.
 */
export interface DatoFuncionalResuelto {
  id: number;
  nombre: string;
  /** Estado ACTUAL del ítem en el catálogo (puede ser false en una valoración histórica). */
  activo: boolean;
}

export type ValoracionNutricionalDetalle = Omit<ValoracionNutricional, 'datoFuncional'> & {
  datoFuncional: DatoFuncionalResuelto | null;
};

export function aDetalle(v: ValoracionNutricional): ValoracionNutricionalDetalle {
  const { datoFuncional, ...resto } = v;
  return {
    ...resto,
    datoFuncional: datoFuncional ? { id: datoFuncional.id, nombre: datoFuncional.nombre, activo: datoFuncional.activo } : null,
  };
}
