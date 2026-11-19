import { idCampo } from "./idCampo";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { formatearNumeroClinico } from "./formatoNumero";
import type { ItemInstrumento } from "./instrumento";

type Props = {
  /** Posición del ítem dentro de su parte (1, 2, 3…): la numeración la dibuja la interfaz. */
  indice: number;
  /** Rótulo del ítem en lugar de «indice.» (el MNA usa las letras A–R de su anexo). */
  rotulo?: string;
  item: ItemInstrumento;
  valor: number | null;
  error?: string;
  onChange: (puntos: number) => void;
};

// Un grupo de radios por ítem, dibujado solo desde la definición del instrumento: cada opción muestra
// la etiqueta exacta del anexo y, en tenue, los puntos que se envían. Los puntos de una opción no son
// un total: aquí no se suma nada.
export default function ItemRadios({ indice, rotulo, item, valor, error, onChange }: Props) {
  const etiquetaItem = `${rotulo ?? `${indice}.`} ${item.nombre}`;
  const idError = `${idCampo(item.campo)}-error`;
  return (
    <fieldset
      id={idCampo(item.campo)}
      tabIndex={-1}
      aria-describedby={error ? idError : undefined}
      className={cn("space-y-2 rounded-md border p-3 outline-none", error ? "border-red-600 bg-red-50" : "border-transparent hover:bg-muted/40")}
    >
      <legend className="px-1 text-sm font-medium">{etiquetaItem}</legend>
      <RadioGroup
        value={valor === null ? "" : String(valor)}
        onValueChange={(v) => onChange(Number(v))}
        aria-label={etiquetaItem}
        aria-invalid={!!error}
        className="gap-2"
      >
        {item.opciones.map((o) => {
          const id = `${idCampo(item.campo)}-${o.puntos}`;
          return (
            <label key={o.puntos} htmlFor={id} className="flex cursor-pointer items-start gap-2 text-sm">
              <RadioGroupItem id={id} value={String(o.puntos)} className="mt-0.5" />
              <span>
                {o.etiqueta} <span className="text-muted-foreground">({formatearNumeroClinico(o.puntos)})</span>
              </span>
            </label>
          );
        })}
      </RadioGroup>
      {error && <p id={idError} className="text-sm text-red-700" role="alert">{error}</p>}
    </fieldset>
  );
}
