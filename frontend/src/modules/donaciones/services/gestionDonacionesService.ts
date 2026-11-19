import type { FiltrarRegistrosParams, Registro, RegistroDonacionPreview, RegistroPorSolicitud } from "../models/registroDonacion";
import sidnamAPI from "@/api/apiConfig";
import {
  rutaRegistrosDonacionPreview,
  rutaReporteDonacionesPorMes,
  rutaCambiarEstadoARecibido,
  rutaCrearRegistroDonacion,
  rutaEditarRegistroDonacion,
  rutaRegistroDonacionPorId,
  rutaRegistroDonacionPorSolicitud,
  rutaFiltrarDonaciones
} from "./rutas";
import type { CrearRegistroDonacion, EditarRegistroDonacion } from "../models/accionesRegistro";

//gets

export const getPreviewRegistroDonaciones = async (page?: number, limit?: number): Promise<{ data: RegistroDonacionPreview[]; total: number }> => {
  const response = await sidnamAPI.get<{
    data: RegistroDonacionPreview[];
    total: number;
  }>(`${rutaRegistrosDonacionPreview}?page=${page}&limit=${limit}`);
  return response.data;
};

export const getRegistroDonacionPorId = async (id: number): Promise<Registro> => {
  const response = await sidnamAPI.get<Registro>(
    `${rutaRegistroDonacionPorId}/${id}`
  );

  return response.data;
};

export const getRegistroDonacionPorSolicitud = async (id: number): Promise<RegistroPorSolicitud> => {
  const response = await sidnamAPI.get<RegistroPorSolicitud>(
    `${rutaRegistroDonacionPorSolicitud}/${id}`
  );

  return response.data;
};

export const getReporteDonacionesPorMes = async (mes: number, anio: number): Promise<Blob> => {
  const response = await sidnamAPI.get(rutaReporteDonacionesPorMes, {
    params: {
      month: mes,
      year: anio
    },
    responseType: 'blob',
  });

  return response.data;
};

export const getFiltrarRegistrosDonaciones = async (
  params: FiltrarRegistrosParams
): Promise<{ data: RegistroDonacionPreview[]; total: number }> => {
  const response = await sidnamAPI.get<{
    data: RegistroDonacionPreview[];
    total: number;
  }>(rutaFiltrarDonaciones, {
    params: {
      origen: 'registro',
      ...(params.search        && { search:      params.search }),
      ...(params.recibida      && { recibida:     params.recibida }),
      ...(params.fechaInicio   && { fechaInicio:  params.fechaInicio }),
      ...(params.fechaFin      && { fechaFin:     params.fechaFin }),
      ...(params.page          && { page:         params.page }),
      ...(params.limit         && { limit:        params.limit }),
    },
  });
  return response.data;
};

// posts

export const postCrearRegistroDonacion = async (
  { idUsuario, registro }: { idUsuario: number; registro: CrearRegistroDonacion }
): Promise<CrearRegistroDonacion> => {
  const response = await sidnamAPI.post<CrearRegistroDonacion>(
    `${rutaCrearRegistroDonacion}/${idUsuario}`,
    registro
  );
  return response.data;
};

//patch

export const patchCambiarEstadoARecibido = async (
  { idRegistro, idUsuario }: { idRegistro: number; idUsuario: number; }): Promise<{ message: string }> => {
  const response = await sidnamAPI.patch<{ message: string }>(
    `${rutaCambiarEstadoARecibido}/${idRegistro}/${idUsuario}`
  );
  return response.data;
};

export const patchEditarRegistroDonacion = async (
  { idRegistro, registroEditado }: { idRegistro: number; registroEditado: EditarRegistroDonacion }
): Promise<EditarRegistroDonacion> => {
  const response = await sidnamAPI.patch<EditarRegistroDonacion>(
    `${rutaEditarRegistroDonacion}/${idRegistro}`,
    registroEditado
  );
  return response.data;
};