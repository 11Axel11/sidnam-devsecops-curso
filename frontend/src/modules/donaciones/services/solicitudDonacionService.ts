import type { SolicitudDonacionPreview, SolicitudDonacionRevision } from "../models/solicitudDonacion";
import sidnamAPI from "@/api/apiConfig";
import { rutaSolicitudesDonacionPreview, rutaEstadoSolicitudDonacion, rutaSolicitudesDonacionPorId, rutaFiltrarPorEstadoSolicitudDonacion, rutaCambiarEstadoSolicitudDonacion } from "./rutas";
import type { EstadoTipo } from "@/models/sharedModels";


//gets

export const getPreviewSolicitudDonacion = async (page?: number, limit?: number): Promise<{ data: SolicitudDonacionPreview[]; total: number }> => {
  const response = await sidnamAPI.get<{
    data: SolicitudDonacionPreview[];
    total: number;
  }>(`${rutaSolicitudesDonacionPreview}?page=${page}&limit=${limit}`);
  return response.data;
};

export const getSolicitudesDonacionPorId = async (id: number): Promise<SolicitudDonacionRevision> => {
  const response = await sidnamAPI.get<SolicitudDonacionRevision>(
    `${rutaSolicitudesDonacionPorId}/${id}`
  );

  return response.data;
};

export const getEstadosSolicitudesDonacion = async (): Promise<EstadoTipo[]> => {
  const response = await sidnamAPI.get<EstadoTipo[]>(
    `${rutaEstadoSolicitudDonacion}`
  );

  return response.data;
};

export const getSolicitudesDonacionPorEstado = async (idEstado: number, page?: number, limit?: number): Promise<{ data: SolicitudDonacionPreview[]; total: number }> => {
  const response = await sidnamAPI.get<{
    data: SolicitudDonacionPreview[];
    total: number;
  }>(`${rutaFiltrarPorEstadoSolicitudDonacion}/${idEstado}?page=${page}&limit=${limit}`);
  return response.data;
};

//post

//export const postSolicitudDonacion = async (solicitud: CrearSolicitudDonacion): Promise<Donacion> => {
//  const response = await sidnamAPI.post<Donacion>(`${rutaSolicitudesDonacionPreview}`, solicitud);
//  return response.data;
//};

//patch

export const patchCambiarEstadoSolicitudDonacion = async (
  { idEstadoSolicitud, idSolicitud, idUsuario }: { idEstadoSolicitud: number, idSolicitud: number, idUsuario: number }
): Promise<{ message: string }> => {
  const response = await sidnamAPI.patch<{ message: string }>(
    `${rutaCambiarEstadoSolicitudDonacion}/${idEstadoSolicitud}/${idSolicitud}/${idUsuario}`
  );
  return response.data;
}
