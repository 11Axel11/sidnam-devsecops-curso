import { ControlNutricional } from '../entities/control-nutricional.entity';
import { calcularVariaciones, Variacion } from './control-nutricional.reglas';

/** Fila de la serie histórica: el control tal cual se guardó + su variación respecto del anterior. */
export type ControlNutricionalConVariacion = ControlNutricional & Variacion;

export interface FiltroDeSerie {
  desde?: string;
  hasta?: string;
  incluirAnulados: boolean;
}

/**
 * Arma la respuesta de `GET …/controles-nutricionales` a partir de la serie COMPLETA del expediente:
 * calcula las variaciones sobre toda la serie (así la primera fila de un rango se compara con el
 * control previo real), luego filtra (anulados, `desde`, `hasta`, inclusivos) y devuelve del más
 * reciente al más antiguo (empate de fecha: el último registrado primero). Función pura.
 */
export function armarSerie(todos: ControlNutricional[], filtro: FiltroDeSerie): ControlNutricionalConVariacion[] {
  const variaciones = calcularVariaciones(todos);
  return todos
    .filter(
      (c) =>
        (filtro.incluirAnulados || !c.anulado) &&
        (filtro.desde === undefined || c.fecha >= filtro.desde) &&
        (filtro.hasta === undefined || c.fecha <= filtro.hasta),
    )
    .map((c) => ({ ...c, ...(variaciones.get(c.id) as Variacion) }))
    .sort((a, b) => (a.fecha === b.fecha ? b.id - a.id : a.fecha < b.fecha ? 1 : -1));
}
