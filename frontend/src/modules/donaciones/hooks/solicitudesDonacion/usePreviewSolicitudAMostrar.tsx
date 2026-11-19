import { useGetPreviewSolicitudDonacion, useGetSolicitudesDonacionPorEstado } from "./solicitudesDonacionHook";

export function useSolicitudesDonacionFiltradas(estadoId: number | undefined, page: number, size: number) {
  const general = useGetPreviewSolicitudDonacion(page, size);
  const filtrado = useGetSolicitudesDonacionPorEstado(estadoId ?? 0, page, size, {
    enabled: estadoId !== undefined,
  });

  return estadoId !== undefined
    ? { data: filtrado.solicitudesDonacionPorEstado, total: filtrado.totalSolicitudesDonacionPorEstado }
    : { data: general.solicitudesDonacion, total: general.totalSolicitudesDonacion, cargando: filtrado.loadingSolicitudesDonacionPorEstado };
}
