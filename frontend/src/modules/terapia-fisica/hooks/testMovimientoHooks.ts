import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMutacionInvalidando } from "@/components/app/clinico/useMutacionInvalidando";
import type { FiltrosAplicacion } from "../models/testMovimiento";
import { getAplicaciones, patchAnularAplicacion, postAplicacion } from "../services/testMovimientoServices";

// Todas las claves cuelgan de este prefijo: una sola invalidación refresca la serie con cualquier filtro.
const RAIZ = ["terapiaFisica", "testMovimiento"] as const;

export const testMovimientoKeys = {
  raiz: RAIZ,
  serie: (expedienteId: number, f: FiltrosAplicacion) =>
    [...RAIZ, expedienteId, "serie", f.desde ?? "", f.hasta ?? "", f.incluirAnulados] as const,
};

export function useAplicaciones(expedienteId: number, filtros: FiltrosAplicacion, enabled = true) {
  return useQuery({
    queryKey: testMovimientoKeys.serie(expedienteId, filtros),
    queryFn: () => getAplicaciones(expedienteId, filtros),
    enabled: enabled && expedienteId > 0,
    // Al cambiar el filtro se conserva la serie anterior en pantalla mientras llega la nueva.
    placeholderData: keepPreviousData,
  });
}

export const useCrearAplicacion = () => useMutacionInvalidando(postAplicacion, RAIZ);
export const useAnularAplicacion = () => useMutacionInvalidando(patchAnularAplicacion, RAIZ);
