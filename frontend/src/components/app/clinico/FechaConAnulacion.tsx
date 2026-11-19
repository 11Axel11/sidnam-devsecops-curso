import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatearFechaClinica, formatearInstanteCR } from "./fechaClinica";
import ResponsableValoracion from "./ResponsableValoracion";
import type { RegistroAnulable } from "./tipos";

type Props = {
  registro: RegistroAnulable;
  /** Texto de la fecha ya formateado (p. ej. fecha y hora de un evento); por defecto, `registro.fecha`. */
  textoFecha?: string;
};

// Celda «Fecha» de las series: la fecha clínica y, si el registro está anulado, la insignia con el
// motivo, quién lo anuló y cuándo.
export default function FechaConAnulacion({ registro: r, textoFecha }: Props) {
  return (
    <div className={cn("space-y-1 text-left", r.anulado && "text-muted-foreground")}>
      <div className="whitespace-nowrap">{textoFecha ?? formatearFechaClinica(r.fecha)}</div>
      {r.anulado && (
        <div className="space-y-1">
          <Badge variant="denied">Anulado</Badge>
          <p className="max-w-[220px] whitespace-pre-wrap break-words text-xs">Motivo: {r.motivoAnulacion ?? "—"}</p>
          <p className="text-xs">
            <ResponsableValoracion id={r.anuladoPorId} nombre={r.anuladoPorNombre} /> · {formatearInstanteCR(r.fechaAnulacion)}
          </p>
        </div>
      )}
    </div>
  );
}
