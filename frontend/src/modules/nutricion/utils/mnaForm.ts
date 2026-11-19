import type { ItemInstrumento } from "@/components/app/clinico/instrumento";
import { formatearFechaClinica } from "@/components/app/clinico/fechaClinica";
import { MNA_V1 } from "../instrumentos/mnaV1";
import type { ControlNutricionalFila } from "../models/controlNutricional";
import type { EvaluacionMna } from "../models/mna";
import { formatearMedida } from "./controlNutricionalForm";

// Controles que se pueden vincular a una evaluación de esa fecha: no anulados y con fecha ≤ la de la
// evaluación, del más reciente al más antiguo. Es solo la lista que ofrece la pantalla; las reglas del
// vínculo (otro expediente, anulado, posterior, ya vinculado) las aplica el backend.
export const controlesElegibles = (controles: readonly ControlNutricionalFila[], fecha: string) =>
  controles
    .filter((c) => !c.anulado && c.fecha <= fecha)
    .sort((a, b) => (a.fecha === b.fecha ? b.id - a.id : a.fecha < b.fecha ? 1 : -1));

// Ids de controles que ya tienen una evaluación MNA activa (informativo: la regla es del backend).
export const controlesVinculados = (evaluaciones: readonly EvaluacionMna[]) =>
  new Set(evaluaciones.filter((e) => !e.anulado && e.controlNutricionalId !== null).map((e) => e.controlNutricionalId as number));

// Control propuesto por defecto: el más reciente elegible que todavía no esté vinculado a otra evaluación.
export const controlPropuesto = (elegibles: readonly ControlNutricionalFila[], vinculados: ReadonlySet<number>) =>
  elegibles.find((c) => !vinculados.has(c.id)) ?? null;

// «27/10/2026 — IMC 25,3 kg/m²» (el IMC es el que guardó el backend con el control).
export const textoControl = (c: Pick<ControlNutricionalFila, "fecha" | "imc">) =>
  `${formatearFechaClinica(c.fecha)} — IMC ${formatearMedida(c.imc)} kg/m²`;

// Opción de un ítem (etiqueta exacta de `MNA_V1`) que corresponde a un valor que DEVOLVIÓ el backend (vista
// previa o registro). Es solo una búsqueda en la constante: no se deriva nada de las medidas del control.
export const opcionDeItem = (campo: string, puntos: number | null | undefined) => {
  const items: readonly ItemInstrumento[] = MNA_V1.secciones.flatMap((s) => [...s.items]);
  const item = items.find((i) => i.campo === campo);
  return item?.opciones.find((o) => o.puntos === puntos) ?? null;
};
export const opcionItemF = (puntos: number | null | undefined) => opcionDeItem("itemF", puntos);
