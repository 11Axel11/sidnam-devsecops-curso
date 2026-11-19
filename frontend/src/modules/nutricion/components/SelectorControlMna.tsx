import CampoValoracion from "@/components/app/clinico/CampoValoracion";
import { idCampo } from "@/components/app/clinico/idCampo";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ControlNutricionalFila } from "../models/controlNutricional";
import { textoControl } from "../utils/mnaForm";

type Props = {
  /** Controles ofrecidos (no anulados, fecha ≤ la de la evaluación), del más reciente al más antiguo. */
  controles: readonly ControlNutricionalFila[];
  /** Ids con una evaluación MNA activa (se rotulan; el backend decide si el vínculo procede). */
  vinculados: ReadonlySet<number>;
  /** Control vinculado efectivo o `null` si no hay vínculo. */
  valor: number | null;
  onChange: (controlId: number | null) => void;
  /** Errores del backend sobre el vínculo (400 `controlNutricionalId …`, 409). */
  errores?: string[];
  /** Aviso informativo (p. ej. el control elegido quedó posterior a la nueva fecha). */
  aviso?: string | null;
};

const SIN_VINCULAR = "sin-vincular";

// Selector opcional del control nutricional cuyo IMC alimenta el ítem F. Con «Sin vincular» el ítem F se
// elige a mano. Las opciones muestran fecha e IMC tal como los guardó el backend.
export default function SelectorControlMna({ controles, vinculados, valor, onChange, errores = [], aviso }: Props) {
  return (
    <CampoValoracion
      nombre="controlNutricionalId"
      etiqueta="Control nutricional (IMC)"
      error={errores.length > 0 ? errores.join(" · ") : undefined}
    >
      <Select
        value={valor === null ? SIN_VINCULAR : String(valor)}
        onValueChange={(v) => onChange(v === SIN_VINCULAR ? null : Number(v))}
      >
        <SelectTrigger id={idCampo("controlNutricionalId")} className="w-full" aria-invalid={errores.length > 0}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={SIN_VINCULAR}>Sin vincular (elegir el ítem F)</SelectItem>
          {controles.map((c) => (
            <SelectItem key={c.id} value={String(c.id)}>
              {textoControl(c)}{vinculados.has(c.id) ? " · ya vinculado a otra evaluación" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Opcional. Si vinculas un control, el sistema toma el ítem F del IMC de ese control; el ítem F no se elige a mano.
        {controles.length === 0 && " No hay controles no anulados con fecha igual o anterior a la de la evaluación."}
      </p>
      {aviso && <p className="text-sm text-[#A7074D]" role="status">{aviso}</p>}
    </CampoValoracion>
  );
}
