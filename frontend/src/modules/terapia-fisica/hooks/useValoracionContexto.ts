import { useMemo } from "react";
import {
  useHistorialValoraciones, useValoracionDetalle, useValoracionVigente,
} from "./valoracionHooks";

export type OrigenContexto = "solicitada" | "borrador" | "vigente";

// Valoración sobre la que trabajan las subpantallas de Terapia Física (antecedentes traumáticos y las
// que siguen). Orden: la pedida con `?valoracion=<id>`; si no, el borrador abierto; si no, la vigente
// (solo lectura); si no hay ninguna, `valoracion` queda en undefined y la pantalla muestra el estado vacío.
export function useValoracionContexto(expedienteId: number, valoracionId?: number) {
  const historial = useHistorialValoraciones(expedienteId);
  const vigente = useValoracionVigente(expedienteId);

  // `…/vigente` no devuelve borradores: el borrador abierto sale del historial (más reciente primero).
  const borradorAbierto = useMemo(
    () => historial.data?.find((v) => v.estado === "borrador" && !v.anulado),
    [historial.data],
  );

  const idResuelto = valoracionId ?? borradorAbierto?.id ?? vigente.data?.id;
  const origen: OrigenContexto | undefined = valoracionId
    ? "solicitada"
    : borradorAbierto
      ? "borrador"
      : vigente.data
        ? "vigente"
        : undefined;

  const detalle = useValoracionDetalle(idResuelto);

  // Con `?valoracion` no hace falta esperar la resolución; sin él se espera al historial y, si no hay
  // borrador, a la vigente.
  const resolviendo = !valoracionId && (historial.isLoading || (!borradorAbierto && vigente.isLoading));
  const errorResolucion = !valoracionId && !borradorAbierto
    ? (historial.error ?? vigente.error)
    : null;

  return {
    valoracion: detalle.data,
    origen,
    borradorAbierto,
    cargando: resolviendo || (!!idResuelto && detalle.isLoading),
    error: errorResolucion ?? detalle.error,
  };
}
