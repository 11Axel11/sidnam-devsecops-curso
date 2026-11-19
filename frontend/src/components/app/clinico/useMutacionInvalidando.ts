import { useMutation, useQueryClient } from "@tanstack/react-query";

// Mutación que, al tener éxito, invalida todo lo que cuelga de `queryKeyRaiz` (historial, vigente,
// detalle…). Cada módulo clínico pasa su propio prefijo de claves.
export function useMutacionInvalidando<TVars, TData>(
  fn: (v: TVars) => Promise<TData>,
  queryKeyRaiz: readonly unknown[],
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeyRaiz }),
  });
}
