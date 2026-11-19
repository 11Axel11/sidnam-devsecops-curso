import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getResumenExpedienteResidente } from "@/modules/residentes/services/expedientesServices";
import { MENSAJE_EXPEDIENTE_INACTIVO } from "./expedienteInactivo";

// Clave PROPIA que cuelga del prefijo de la del layout del expediente (`["expedienteResidenteResumenId", id]`):
// cerrar o reactivar el expediente (que invalida ese prefijo) la refresca también, pero refrescarla NO
// dispara el `<WebLoader />` del layout (que desmontaría el formulario abierto y perdería lo escrito).
const claveEstado = (expedienteId: number) => ["expedienteResidenteResumenId", expedienteId, "estadoClinico"] as const;

// Estado del expediente (`Activo` / `Inactivo`) para las pantallas clínicas. Mientras no se conoce se
// considera activo: el backend es quien bloquea de verdad (409 `EXPEDIENTE_INACTIVO`).
export function useExpedienteActivo(expedienteId: number) {
  const qc = useQueryClient();
  const { data: estado } = useQuery({
    queryKey: claveEstado(expedienteId),
    queryFn: () => getResumenExpedienteResidente(expedienteId),
    select: (d) => d.estado,
    enabled: expedienteId > 0,
    staleTime: 15_000,
  });
  const activo = estado !== "Inactivo";
  // Se llama cuando un envío vuelve con 409 `EXPEDIENTE_INACTIVO` (lo cerraron con el formulario abierto).
  const refrescar = useCallback(() => qc.invalidateQueries({ queryKey: claveEstado(expedienteId) }), [qc, expedienteId]);
  return { activo, estado, motivo: activo ? null : MENSAJE_EXPEDIENTE_INACTIVO, refrescar };
}
