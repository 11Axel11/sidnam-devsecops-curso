import { formatearNumeroClinico } from "@/components/app/clinico/formatoNumero";
import { idCampo } from "@/components/app/clinico/idCampo";
import type { ItemOrigen } from "../models/mna";
import { letraDeCampo } from "../schemas/mnaSchema";
import { opcionDeItem } from "../utils/mnaForm";

type Props = {
  campo: "itemF" | "itemQ" | "itemR";
  nombre: string;
  /** Origen que informó la vista previa; sin él (todavía no hay vista previa) solo se avisa que se derivará. */
  origen?: ItemOrigen;
  error?: string;
};

// Cómo se rotula la medida del control: IMC (kg/m²), CB y CP (cm). Solo presentación.
const MEDIDA: Record<Props["campo"], { sigla: string; unidad: string }> = {
  itemF: { sigla: "IMC", unidad: "kg/m²" },
  itemQ: { sigla: "CB", unidad: "cm" },
  itemR: { sigla: "CP", unidad: "cm" },
};

// «CB 21,4 cm → 21 → CB de 21 a 22 (0,5)»: la medida, su redondeo y el valor son los que DEVUELVE el
// backend en `itemsOrigen`; la etiqueta es la de `MNA_V1` para ese valor. Aquí no se deriva ni se redondea nada.
function textoDerivacion(campo: Props["campo"], o: ItemOrigen): string {
  const { sigla, unidad } = MEDIDA[campo];
  const opcion = opcionDeItem(campo, o.valor);
  const partes = [`${sigla} ${formatearNumeroClinico(o.medida)} ${unidad}`];
  if (o.medidaRedondeada !== undefined) partes.push(formatearNumeroClinico(o.medidaRedondeada));
  partes.push(opcion ? `${opcion.etiqueta} (${formatearNumeroClinico(opcion.puntos)})` : formatearNumeroClinico(o.valor));
  return partes.join(" → ");
}

// Ítem F, Q o R cuando lo deriva el control vinculado: solo lectura, no se envía.
export default function ItemDerivadoMna({ campo, nombre, origen, error }: Props) {
  return (
    <fieldset id={idCampo(campo)} tabIndex={-1} className="space-y-2 rounded-md border border-transparent bg-muted/40 p-3 outline-none">
      <legend className="px-1 text-sm font-medium">{letraDeCampo(campo)}. {nombre}</legend>
      <p className="text-sm text-muted-foreground">Se toma del control vinculado (solo lectura).</p>
      <p className="text-sm" aria-live="polite">
        {origen
          ? <strong className="text-[#A7074D]">{textoDerivacion(campo, origen)}</strong>
          : <span className="text-muted-foreground">El sistema derivará este ítem cuando respondas los ítems A–E.</span>}
      </p>
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
    </fieldset>
  );
}
