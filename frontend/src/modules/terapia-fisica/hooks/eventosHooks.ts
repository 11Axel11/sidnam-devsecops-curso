import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMutacionInvalidando } from "@/components/app/clinico/useMutacionInvalidando";
import type { FiltrosEvento } from "../models/eventos";
import { getEventos, patchAnularEvento, postEvento } from "../services/eventosServices";

// Todas las claves cuelgan de este prefijo: una sola invalidación refresca la serie con cualquier filtro.
const RAIZ = ["terapiaFisica", "eventos"] as const;

export const eventoKeys = {
  raiz: RAIZ,
  serie: (expedienteId: number, f: FiltrosEvento) =>
    [...RAIZ, expedienteId, "serie", f.desde ?? "", f.hasta ?? "", f.tipoEventoId ?? 0, f.incluirAnulados] as const,
};

export function useEventos(expedienteId: number, filtros: FiltrosEvento, enabled = true) {
  return useQuery({
    queryKey: eventoKeys.serie(expedienteId, filtros),
    queryFn: () => getEventos(expedienteId, filtros),
    enabled: enabled && expedienteId > 0,
    // Al cambiar el filtro se conserva la serie anterior en pantalla mientras llega la nueva.
    placeholderData: keepPreviousData,
  });
}

export const useCrearEvento = () => useMutacionInvalidando(postEvento, RAIZ);
export const useAnularEvento = () => useMutacionInvalidando(patchAnularEvento, RAIZ);
