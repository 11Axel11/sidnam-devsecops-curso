import sidnamAPI from "@/api/apiConfig";
import type { CrearExpedienteVoluntario, EditarExpediente } from "../models/accionesExpediente";
import { rutaEliminarHorario, rutaExpedienteActivoPorCedula, rutaExpedientesVoluntarioPorId, rutaExpedientesVoluntariosActivos, rutaExpedienteVoluntario, rutaExpedienteVoluntarioPorCedula } from "./rutas";
import type { Expediente, ExpedienteVoluntarioPreview } from "../models/expedienteVoluntario";
import axios from "axios";
import type { Horario } from "../models/voluntario";

// posts

export const createExpedienteVoluntario = async (
  { idUsuario, solicitud }: { idUsuario: number; solicitud: CrearExpedienteVoluntario }
): Promise<CrearExpedienteVoluntario> => {
  const response = await sidnamAPI.post<CrearExpedienteVoluntario>(
    `${rutaExpedienteVoluntario}/${idUsuario}`,
    solicitud
  );
  return response.data;
};

// gets

export const getExpedienteVoluntarioPorId = async (id: number): Promise<Expediente> => {
  const response = await sidnamAPI.get<Expediente>(
    `${rutaExpedientesVoluntarioPorId}/${id}`
  );

  return response.data;
};

export const getPreviewExpedientesVoluntarioActivos = async (page?: number, limit?: number): Promise<{ data: ExpedienteVoluntarioPreview[]; total: number }> => {
  const response = await sidnamAPI.get<{
    data: ExpedienteVoluntarioPreview[];
    total: number;
  }>(`${rutaExpedientesVoluntariosActivos}/preview?page=${page}&limit=${limit}`);
  return response.data;
};


export const getAllExpedientesVoluntarioPorCedula = async (cedula: number, page?: number, limit?: number): 
Promise<{ data: ExpedienteVoluntarioPreview[]; total: number }> => {
  try {
    const response = await sidnamAPI.get<{
      data: ExpedienteVoluntarioPreview[];
      total: number;
    }>(`${rutaExpedienteVoluntarioPorCedula}/${cedula}?page=${page}&limit=${limit}`);

    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return {
        data: [],
        total: 0,
      };
    }
    throw error;
  }
};

export const getExpedienteActivoPorCedula = async (
  cedula: string
): Promise<ExpedienteVoluntarioPreview | null> => {
  try {
    const response = await sidnamAPI.get<ExpedienteVoluntarioPreview>(
      `${rutaExpedienteActivoPorCedula}/${cedula}`
    );
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

// patch 


export const editarExpedienteVoluntario = async (
  { idExpediente, expedienteEditado }: { idExpediente: number; expedienteEditado: EditarExpediente }
): Promise<EditarExpediente> => {
  const response = await sidnamAPI.patch<EditarExpediente>(
    `${rutaExpedienteVoluntario}/${idExpediente}`,
    expedienteEditado
  );
  return response.data;
}

export const desactivarExpedienteVoluntario = async (
   idExpediente: number 
): Promise<{message: string}> => {
  const response = await sidnamAPI.patch<{message: string}>(
    `${rutaExpedienteVoluntario}/${idExpediente}/inactivar`,
  );
  return response.data;
}


// delete 

export const deleteHorarioVoluntario = async (
  { idHorario }: { idHorario: number;  }
): Promise<Horario> => {
  const response = await sidnamAPI.delete<Horario>(
    `${rutaEliminarHorario}/${idHorario}`,
  );
  return response.data;
};