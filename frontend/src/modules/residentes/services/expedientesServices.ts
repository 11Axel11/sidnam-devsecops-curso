import sidnamAPI from '@/api/apiConfig';
import type { EstadoTipo } from '@/models/sharedModels';
import { rutaBaseExpedientesResidentes, rutaBaseExpedientesResidentesBusqueda, rutaBaseResidentes } from './rutas';
import type { CrearExpedienteResidente, EditarExpedienteResidente, ExpedienteResidente, PreviewExpedienteResidente, ResumenExpedienteResidente } from '../models/expedienteResidente';

// get

export const getTiposPension = async (): Promise<EstadoTipo[]> => {
  const response = await sidnamAPI.get<EstadoTipo[]>(`${rutaBaseResidentes}/tipos-pension`);

  return response.data;
};

export const getTiposDependencia = async (): Promise<EstadoTipo[]> => {
  const response = await sidnamAPI.get<EstadoTipo[]>(`${rutaBaseResidentes}/dependencia`);

  return response.data;
};

export const getEstadoCivil = async (): Promise<EstadoTipo[]> => {
  const response = await sidnamAPI.get<EstadoTipo[]>(`${rutaBaseResidentes}/estado-civil`);

  return response.data;
};

export const getLineaPobreza = async (): Promise<EstadoTipo[]> => {
  const response = await sidnamAPI.get<EstadoTipo[]>(`${rutaBaseResidentes}/linea-pobreza`);

  return response.data;
};

export const getPreviewExpedientesResidentes = async (
  estado: number,
  page?: number,
  limit?: number
) => {
  try {
    const response = await sidnamAPI.get(`/residentes/expedientes/estado/${estado}`, {
      params: { page, limit }
    });
    return response.data;

  } catch (error) {
    if (error === 404) {
      return {
        data: [],
        total: 0
      };
    }
    throw error;
  }
};

export const getExpedienteResidentePorId = async (id: number): Promise<ExpedienteResidente> => {
  const response = await sidnamAPI.get<ExpedienteResidente>(
    `${rutaBaseExpedientesResidentes}/${id}`
  );

  return response.data;
};


export const getResumenExpedienteResidente = async (id: number): Promise<ResumenExpedienteResidente> => {
  const response = await sidnamAPI.get<ResumenExpedienteResidente>(
    `${rutaBaseResidentes}/informacion-personal/${id}`
  );

  return response.data;
};


export const getExpedienteResidentePorCedula = async (cedula: number): Promise<PreviewExpedienteResidente> => {
  const response = await sidnamAPI.get<PreviewExpedienteResidente>(
    `${rutaBaseExpedientesResidentesBusqueda}/${cedula}`
  );

  return response.data;
};

export const getExpedienteResidentePorNombre = async (nombre: string): Promise<PreviewExpedienteResidente[]> => {
  const response = await sidnamAPI.get<PreviewExpedienteResidente[]>(
    `${rutaBaseResidentes}/filtrar-nombre?filtro=${nombre}`
  );

  return response.data;
};


// post

export const createExpedienteResidente = async (
  { expediente }: { expediente: CrearExpedienteResidente }
): Promise<CrearExpedienteResidente> => {
  const response = await sidnamAPI.post<CrearExpedienteResidente>(
    `${rutaBaseResidentes}/expediente`,
    expediente
  );
  return response.data;
};

// patch 


export const editarExpedienteResidente = async (
  { idExpediente, expedienteEditado }: { idExpediente: number; expedienteEditado: EditarExpedienteResidente }
): Promise<EditarExpedienteResidente> => {
  const response = await sidnamAPI.patch<EditarExpedienteResidente>(
    `${rutaBaseExpedientesResidentesBusqueda}/${idExpediente}`,
    expedienteEditado
  );
  return response.data;
}