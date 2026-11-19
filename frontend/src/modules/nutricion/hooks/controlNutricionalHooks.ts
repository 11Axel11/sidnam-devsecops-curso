import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMutacionInvalidando } from "@/components/app/clinico/useMutacionInvalidando";
import type { FiltrosControl } from "../models/controlNutricional";
import {
  getControlesNutricionales, patchAnularControlNutricional, postControlNutricional,
} from "../services/controlNutricionalServices";

// Todas las claves cuelgan de este prefijo: una sola invalidación refresca la serie con cualquier filtro.
const RAIZ = ["nutricion", "controles"] as const;

export const controlNutricionalKeys = {
  raiz: RAIZ,
  serie: (expedienteId: number, f: FiltrosControl) =>
    [...RAIZ, expedienteId, "serie", f.desde ?? "", f.hasta ?? "", f.incluirAnulados] as const,
};

export function useControlesNutricionales(expedienteId: number, filtros: FiltrosControl, enabled = true) {
  return useQuery({
    queryKey: controlNutricionalKeys.serie(expedienteId, filtros),
    queryFn: () => getControlesNutricionales(expedienteId, filtros),
    enabled: enabled && expedienteId > 0,
    // Al cambiar el filtro se conserva la serie anterior en pantalla mientras llega la nueva.
    placeholderData: keepPreviousData,
  });
}

export const useCrearControlNutricional = () => useMutacionInvalidando(postControlNutricional, RAIZ);
export const useAnularControlNutricional = () => useMutacionInvalidando(patchAnularControlNutricional, RAIZ);
