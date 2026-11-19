import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMutacionInvalidando } from "@/components/app/clinico/useMutacionInvalidando";
import type { FiltrosMna, PayloadMna } from "../models/mna";
import {
  getEvaluacionesMna, patchAnularEvaluacionMna, postCalcularMna, postEvaluacionMna,
} from "../services/mnaServices";

// Todas las claves de la serie cuelgan de este prefijo: una sola invalidación refresca la serie con
// cualquier filtro. La vista previa vive en otra raíz: registrar no debe volver a pedirla.
const RAIZ = ["nutricion", "mna"] as const;
const RAIZ_PREVIA = ["nutricion", "mnaPrevia"] as const;

export const mnaKeys = {
  raiz: RAIZ,
  serie: (expedienteId: number, f: FiltrosMna) =>
    [...RAIZ, expedienteId, "serie", f.desde ?? "", f.hasta ?? "", f.incluirAnulados] as const,
  previa: (expedienteId: number, cuerpo: string) => [...RAIZ_PREVIA, expedienteId, cuerpo] as const,
};

export function useEvaluacionesMna(expedienteId: number, filtros: FiltrosMna, enabled = true) {
  return useQuery({
    queryKey: mnaKeys.serie(expedienteId, filtros),
    queryFn: () => getEvaluacionesMna(expedienteId, filtros),
    enabled: enabled && expedienteId > 0,
    // Al cambiar el filtro se conserva la serie anterior en pantalla mientras llega la nueva.
    placeholderData: keepPreviousData,
  });
}

// Vista previa del backend para el cuerpo actual (`null` = todavía no hay datos suficientes). Se consume la
// `signal` de la query: al cambiar el cuerpo, React Query aborta la petición anterior. Se conserva la
// respuesta previa mientras llega la nueva (el panel no parpadea) y no se reintenta: un 400/409 es una
// respuesta, no una falla de red. `staleTime: 0` y `gcTime` corto: volver a un cuerpo ya visto vuelve a
// consultar al backend (un control pudo vincularse a otra evaluación mientras tanto).
export function useVistaPreviaMna(expedienteId: number, cuerpo: PayloadMna | null) {
  return useQuery({
    queryKey: mnaKeys.previa(expedienteId, JSON.stringify(cuerpo)),
    queryFn: ({ signal }) => postCalcularMna(expedienteId, cuerpo as PayloadMna, signal),
    enabled: cuerpo !== null && expedienteId > 0,
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: 0,
    gcTime: 30_000,
  });
}

// Descarta toda la vista previa en caché (al guardar, anular o salir del formulario).
export function useLimpiarVistaPreviaMna() {
  const qc = useQueryClient();
  return () => qc.removeQueries({ queryKey: RAIZ_PREVIA });
}

export const useCrearEvaluacionMna = () => useMutacionInvalidando(postEvaluacionMna, RAIZ);
export const useAnularEvaluacionMna = () => useMutacionInvalidando(patchAnularEvaluacionMna, RAIZ);
