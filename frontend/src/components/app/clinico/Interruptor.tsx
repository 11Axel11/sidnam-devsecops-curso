import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { idCampo } from "./idCampo";

type Props = {
  /** Nombre del campo del DTO; el control usa id={`campo-${nombre}`}. */
  nombre: string;
  etiqueta: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  error?: string;
};

// Interruptor sí/no de las valoraciones clínicas: el valor siempre es true/false, nunca null.
export default function Interruptor({ nombre, etiqueta, checked, onChange, error }: Props) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <Switch id={idCampo(nombre)} checked={checked} onCheckedChange={onChange} />
        <Label htmlFor={idCampo(nombre)} className="cursor-pointer">{etiqueta}</Label>
        <span className="text-xs text-muted-foreground">{checked ? "Sí" : "No"}</span>
      </div>
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
    </div>
  );
}
