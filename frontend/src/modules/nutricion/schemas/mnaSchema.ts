import z from "zod";
import { crearFechaClinicaSchema } from "@/components/app/clinico/fechaSchema";
import type { ItemInstrumento } from "@/components/app/clinico/instrumento";
import { MNA_V1 } from "../instrumentos/mnaV1";
import type { CampoDerivable, ItemsOrigen, PayloadMna } from "../models/mna";

export const ITEMS_CRIBAJE: readonly ItemInstrumento[] = MNA_V1.secciones[0].items;
export const ITEMS_EVALUACION: readonly ItemInstrumento[] = MNA_V1.secciones[1].items;
export const ITEMS_MNA: readonly ItemInstrumento[] = [...ITEMS_CRIBAJE, ...ITEMS_EVALUACION];

// Estado del formulario: una opción (los `puntos`) por ítem o `null` si falta. `controlElegido`:
// `undefined` = el usuario no ha elegido (rige el control propuesto), `null` = «Sin vincular», número =
// control elegido.
export interface ValoresMna {
  fecha: string;
  controlElegido: number | null | undefined;
  items: Record<string, number | null>;
}

export const valoresInicialesMna = (fecha: string): ValoresMna => ({
  fecha,
  controlElegido: undefined,
  items: Object.fromEntries(ITEMS_MNA.map((i) => [i.campo, null])),
});

// «itemK» → «K»: la letra del anexo sale del nombre del campo.
export const letraDeCampo = (campo: string) => campo.replace(/^item/, "");

const opcionValida = (item: ItemInstrumento) => (v: number | null) => v !== null && item.opciones.some((o) => o.puntos === v);

// Esquema de un registro nuevo (espejo del contrato, no la única barrera): fecha válida y no futura; A–E
// con una opción; F con una opción SOLO si no hay control vinculado (con vínculo la deriva el backend);
// G–R opcionales pero, si traen valor, una de sus opciones. NO se replica ninguna regla de la segunda
// parte (cuándo es obligatoria o «todo o nada»): eso lo decide el backend y sus 400 se muestran tal cual.
export const crearEsquemaMna = (conControl: boolean) =>
  z.object({
    fecha: crearFechaClinicaSchema("de la evaluación"),
    items: z.object(
      Object.fromEntries(
        ITEMS_MNA.map((item) => {
          const obligatorio = ITEMS_CRIBAJE.includes(item) && !(item.campo === "itemF" && conControl);
          const base = z.number().nullable();
          return [
            item.campo,
            obligatorio
              ? base.refine(opcionValida(item), "Selecciona una opción")
              : base.refine((v) => v === null || opcionValida(item)(v), "Selecciona una opción"),
          ];
        }),
      ),
    ),
  });

export const CAMPOS_DERIVABLES: readonly CampoDerivable[] = ["itemF", "itemQ", "itemR"];

// Campos que el backend derivó del control vinculado (origen «control»): no se envían ni se cuentan.
export const derivadosDe = (origen?: ItemsOrigen): ReadonlySet<string> =>
  new Set(CAMPOS_DERIVABLES.filter((c) => origen?.[c]?.origen === "control"));

// Cuerpo del POST: fecha, control (si hay vínculo) y los ítems contestados. Con vínculo NO se envía `itemF`
// (lo deriva el backend) ni los ítems que el backend informó como derivados (`derivados`). Números JSON con
// punto; nada calculado.
export function construirPayloadMna(v: ValoresMna, controlId: number | null, derivados: ReadonlySet<string> = new Set()): PayloadMna {
  const body: PayloadMna = { fecha: v.fecha };
  if (controlId !== null) body.controlNutricionalId = controlId;
  for (const [campo, puntos] of Object.entries(v.items)) {
    if (puntos === null) continue;
    if (campo === "itemF" && controlId !== null) continue;
    if (derivados.has(campo)) continue;
    body[campo] = puntos;
  }
  return body;
}

// Cuerpo para la vista previa, o `null` mientras no haya datos suficientes: fecha válida, A–E contestados
// y F (manual o por control). El contrato exige A–E aunque G–R esté vacía. Con control vinculado, Q y R se
// omiten hasta que el backend informe su origen y solo se envían si es «manual» (si el control los deriva,
// enviar otro valor daría 400).
export function cuerpoVistaPrevia(v: ValoresMna, controlId: number | null, origen?: ItemsOrigen): PayloadMna | null {
  if (!crearFechaClinicaSchema("de la evaluación").safeParse(v.fecha).success) return null;
  const faltaCribaje = ITEMS_CRIBAJE.some((i) => v.items[i.campo] === null && !(i.campo === "itemF" && controlId !== null));
  if (faltaCribaje) return null;
  const sinQR = controlId === null ? new Set<string>() : new Set(["itemQ", "itemR"].filter((c) => origen?.[c as CampoDerivable]?.origen !== "manual"));
  return construirPayloadMna(v, controlId, sinQR);
}
