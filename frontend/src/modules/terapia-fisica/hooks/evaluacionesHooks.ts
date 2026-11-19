import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMutacionInvalidando } from "@/components/app/clinico/useMutacionInvalidando";
import type { FiltrosEvaluacion, InstrumentoTF, PayloadEvaluacion } from "../models/evaluaciones";
import { getEvaluaciones, patchAnularEvaluacion, postEvaluacion } from "../services/evaluacionesServices";

// Las claves de cada instrumento cuelgan de su prefijo: una invalidación refresca la serie con cualquier filtro.
export const evaluacionKeys = {
  raiz: (i: InstrumentoTF) => ["terapiaFisica", "evaluaciones", i] as const,
  serie: (i: InstrumentoTF, expedienteId: number, f: FiltrosEvaluacion) =>
    [...evaluacionKeys.raiz(i), expedienteId, "serie", f.desde ?? "", f.hasta ?? "", f.incluirAnulados] as const,
};

export function useEvaluaciones<I extends InstrumentoTF>(
  instrumento: I, expedienteId: number, filtros: FiltrosEvaluacion, enabled = true,
) {
  return useQuery({
    queryKey: evaluacionKeys.serie(instrumento, expedienteId, filtros),
    queryFn: () => getEvaluaciones(instrumento, expedienteId, filtros),
    enabled: enabled && expedienteId > 0,
    // Al cambiar el filtro se conserva la serie anterior en pantalla mientras llega la nueva.
    placeholderData: keepPreviousData,
  });
}

export const useCrearEvaluacion = <I extends InstrumentoTF>(instrumento: I) =>
  useMutacionInvalidando(
    (v: { expedienteId: number; body: PayloadEvaluacion }) => postEvaluacion(instrumento, v),
    evaluacionKeys.raiz(instrumento),
  );

export const useAnularEvaluacion = <I extends InstrumentoTF>(instrumento: I) =>
  useMutacionInvalidando(
    (v: { id: number; motivo: string }) => patchAnularEvaluacion(instrumento, v),
    evaluacionKeys.raiz(instrumento),
  );
