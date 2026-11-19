import { Badge } from "@/components/ui/badge";
import { etiquetaEstado, varianteEstado, type EstadoValoracion } from "./estadoValoracion";

// `anulado` es una bandera aparte (la valoración conserva su estado en el backend), pero una anulada
// ya no está vigente ni en historial: se muestra solo "Anulada" para no contradecirse.
export default function EstadoValoracionBadge({ estado, anulado }: { estado: EstadoValoracion; anulado: boolean }) {
  if (anulado) return <Badge variant="denied">Anulada</Badge>;
  return <Badge variant={varianteEstado[estado]}>{etiquetaEstado[estado]}</Badge>;
}
