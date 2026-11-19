import { useGetPreviewSolicitudVoluntario, useGetSolicitudesVoluntarioPorEstado } from "./solicitudesHooks";

export function useSolicitudesVoluntariadoFiltradas(estadoId: number | undefined, page: number, size: number) {
  const general = useGetPreviewSolicitudVoluntario(page, size);
  const filtrado = useGetSolicitudesVoluntarioPorEstado(estadoId ?? 0, page, size, {
    enabled: estadoId !== undefined,
  });

  return estadoId !== undefined
    ? { data: filtrado.solicitudesVoluntariadoPorEstado, total: filtrado.totalSolicitudesVoluntariadoPorEstado }
    : { data: general.solicitudesVoluntariado, total: general.totalSolicitudesVoluntariado, cargando: filtrado.loadingSolicitudesVoluntariadoPorEstado };
}
