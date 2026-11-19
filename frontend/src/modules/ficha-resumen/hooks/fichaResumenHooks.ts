import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { getFichaResumen } from "../services/fichaResumenServices";

export const fichaResumenKeys = {
  expediente: (expedienteId: number) => ["fichaResumen", expedienteId] as const,
};

// Se consulta solo al abrir el modal (`enabled`). Cambia poco: `staleTime` de 5 min. Un 401/403/404 no se
// reintenta (no va a cambiar); un corte de red sí, hasta 2 veces.
export function useFichaResumen(expedienteId: number, enabled: boolean) {
  return useQuery({
    queryKey: fichaResumenKeys.expediente(expedienteId),
    queryFn: () => getFichaResumen(expedienteId),
    enabled: enabled && expedienteId > 0,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: (intentos, error) => {
      const status = isAxiosError(error) ? error.response?.status : undefined;
      if (status === 401 || status === 403 || status === 404) return false;
      return intentos < 2;
    },
  });
}
