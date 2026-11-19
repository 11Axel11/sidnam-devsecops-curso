import { useQuery } from "@tanstack/react-query";
import { useMutacionInvalidando } from "@/components/app/clinico/useMutacionInvalidando";
import {
  getHistorialValoraciones, getValoracionDetalle, getValoracionVigente, patchAnularValoracion,
  patchAnularAntecedenteTraumatico, patchAntecedenteTraumatico, patchConfirmarValoracion, patchValoracion,
  postAntecedentesPersonales, postAntecedenteTraumatico, postValoracion,
} from "../services/valoracionServices";

// Todas las claves cuelgan de este prefijo: una sola invalidación cubre historial, vigente y detalle.
const RAIZ = ["terapiaFisica", "valoraciones"] as const;

export const valoracionKeys = {
  raiz: RAIZ,
  historial: (expedienteId: number) => [...RAIZ, expedienteId, "historial"] as const,
  vigente: (expedienteId: number) => [...RAIZ, expedienteId, "vigente"] as const,
  detalle: (id: number) => [...RAIZ, "detalle", id] as const,
};

export function useHistorialValoraciones(expedienteId: number) {
  return useQuery({
    queryKey: valoracionKeys.historial(expedienteId),
    queryFn: () => getHistorialValoraciones(expedienteId),
    enabled: expedienteId > 0,
  });
}

export function useValoracionVigente(expedienteId: number) {
  return useQuery({
    queryKey: valoracionKeys.vigente(expedienteId),
    queryFn: () => getValoracionVigente(expedienteId),
    enabled: expedienteId > 0,
  });
}

export function useValoracionDetalle(id: number | undefined) {
  return useQuery({
    queryKey: valoracionKeys.detalle(id ?? 0),
    queryFn: () => getValoracionDetalle(id!),
    enabled: !!id,
  });
}

const useMutacionValoracion = <TVars, TData>(fn: (v: TVars) => Promise<TData>) =>
  useMutacionInvalidando(fn, valoracionKeys.raiz);

export const useCrearValoracion = () => useMutacionValoracion(postValoracion);
export const useActualizarValoracion = () => useMutacionValoracion(patchValoracion);
export const useConfirmarValoracion = () => useMutacionValoracion(patchConfirmarValoracion);
export const useAnularValoracion = () => useMutacionValoracion(patchAnularValoracion);
export const useGuardarAntecedentesPersonales = () => useMutacionValoracion(postAntecedentesPersonales);

// Los antecedentes traumáticos cuelgan del detalle de la valoración: se invalida el mismo prefijo,
// así la pestaña Valoración y la de antecedentes reflejan cada alta, edición y retiro.
export const useCrearAntecedenteTraumatico = () => useMutacionValoracion(postAntecedenteTraumatico);
export const useActualizarAntecedenteTraumatico = () => useMutacionValoracion(patchAntecedenteTraumatico);
export const useAnularAntecedenteTraumatico = () => useMutacionValoracion(patchAnularAntecedenteTraumatico);
