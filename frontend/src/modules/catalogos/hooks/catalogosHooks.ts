import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CatalogoKey } from "../catalogosConfig";
import { getCatalogo, patchEstadoItemCatalogo, postItemCatalogo } from "../services/catalogosServices";

// La clave incluye el catálogo y `soloActivos`: cambiar cualquiera de los dos recarga la lista.
export const catalogoQueryKey = (catalogo: CatalogoKey, soloActivos: boolean) =>
  ['catalogos', catalogo, { soloActivos }] as const;

// Lectura reutilizable (también para las pantallas clínicas): por defecto solo ítems activos,
// que es lo que puede pedir cualquier sesión. `soloActivos: false` requiere Catalogos:Ver.
export function useCatalogoQuery(
  catalogo: CatalogoKey,
  { soloActivos = true, enabled = true }: { soloActivos?: boolean; enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: catalogoQueryKey(catalogo, soloActivos),
    queryFn: () => getCatalogo(catalogo, soloActivos),
    enabled,
  });
}

export function usePostItemCatalogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postItemCatalogo,
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['catalogos', v.catalogo] }),
  });
}

export function usePatchEstadoItemCatalogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: patchEstadoItemCatalogo,
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['catalogos', v.catalogo] }),
  });
}
