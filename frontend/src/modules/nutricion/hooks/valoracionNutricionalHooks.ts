import { useQuery } from "@tanstack/react-query";
import { useMutacionInvalidando } from "@/components/app/clinico/useMutacionInvalidando";
import {
  getHistorialValoracionesNutricionales, getValoracionNutricionalDetalle, getValoracionNutricionalVigente,
  patchAnularValoracionNutricional, patchConfirmarValoracionNutricional, patchValoracionNutricional,
  postValoracionNutricional,
} from "../services/valoracionNutricionalServices";

// Todas las claves cuelgan de este prefijo: una sola invalidación cubre historial, vigente y detalle.
const RAIZ = ["nutricion", "valoraciones"] as const;

export const valoracionNutricionalKeys = {
  raiz: RAIZ,
  historial: (expedienteId: number) => [...RAIZ, expedienteId, "historial"] as const,
  vigente: (expedienteId: number) => [...RAIZ, expedienteId, "vigente"] as const,
  detalle: (id: number) => [...RAIZ, "detalle", id] as const,
};

export function useHistorialValoracionesNutricionales(expedienteId: number) {
  return useQuery({
    queryKey: valoracionNutricionalKeys.historial(expedienteId),
    queryFn: () => getHistorialValoracionesNutricionales(expedienteId),
    enabled: expedienteId > 0,
  });
}

export function useValoracionNutricionalVigente(expedienteId: number) {
  return useQuery({
    queryKey: valoracionNutricionalKeys.vigente(expedienteId),
    queryFn: () => getValoracionNutricionalVigente(expedienteId),
    enabled: expedienteId > 0,
  });
}

export function useValoracionNutricionalDetalle(id: number | undefined) {
  return useQuery({
    queryKey: valoracionNutricionalKeys.detalle(id ?? 0),
    queryFn: () => getValoracionNutricionalDetalle(id!),
    enabled: !!id,
  });
}

const useMutacionValoracionNutricional = <TVars, TData>(fn: (v: TVars) => Promise<TData>) =>
  useMutacionInvalidando(fn, valoracionNutricionalKeys.raiz);

export const useCrearValoracionNutricional = () => useMutacionValoracionNutricional(postValoracionNutricional);
export const useActualizarValoracionNutricional = () => useMutacionValoracionNutricional(patchValoracionNutricional);
export const useConfirmarValoracionNutricional = () => useMutacionValoracionNutricional(patchConfirmarValoracionNutricional);
export const useAnularValoracionNutricional = () => useMutacionValoracionNutricional(patchAnularValoracionNutricional);
