import sidnamAPI from "@/api/apiConfig";
import type { SolicitudVoluntariadoPreview, SolicitudVoluntariadoRevision } from "../models/solicitudVoluntario";
import { rutaSolicitudesVoluntario, rutaFiltrarPorEstadoSolicitudVoluntario } from "./rutas";
import type { EstadoTipo } from "@/models/sharedModels";

// gets

export const getPreviewSolicitudVoluntario = async (page?: number, limit?: number): Promise<{ data: SolicitudVoluntariadoPreview[]; total: number }> => {
  const response = await sidnamAPI.get<{
    data: SolicitudVoluntariadoPreview[];
    total: number;
  }>(`${rutaSolicitudesVoluntario}/preview?page=${page}&limit=${limit}`);
  return response.data;
};

export const getSolicitudesVoluntarioPorId = async (id: number): Promise<SolicitudVoluntariadoRevision> => {
  const response = await sidnamAPI.get<SolicitudVoluntariadoRevision>(
    `${rutaSolicitudesVoluntario}/${id}`
  );

  return response.data;
};

export const getEstadosSolicitudesVoluntario = async (): Promise<EstadoTipo[]> => {
  const response = await sidnamAPI.get<EstadoTipo[]>(
    `${rutaSolicitudesVoluntario}/estados`
  );

  return response.data;
};

export const getSolicitudesVoluntarioPorEstado = async (idEstado: number, page?: number, limit?: number)
: Promise<{ data: SolicitudVoluntariadoPreview[]; total: number }> => {
  const response = await sidnamAPI.get<{
    data: SolicitudVoluntariadoPreview[];
    total: number;
  }>(`${rutaFiltrarPorEstadoSolicitudVoluntario}/${idEstado}?page=${page}&limit=${limit}`);
  return response.data;
};

// patch

export const patchCambiarEstadoSolicitudVoluntariado = async (
  { idEstadoSolicitud, idSolicitud, idUsuario }: { idEstadoSolicitud: number, idSolicitud: number, idUsuario: number }
): Promise<{ message: string }> => {
  const response = await sidnamAPI.patch<{ message: string }>(
    `${rutaSolicitudesVoluntario}/${idSolicitud}/estado/${idEstadoSolicitud}/usuario/${idUsuario}`
  );
  return response.data;
}