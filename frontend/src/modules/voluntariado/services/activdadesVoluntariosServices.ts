import sidnamAPI from "@/api/apiConfig";
import type { EditarActividades, AgregarActividades } from "../models/accionesExpediente";
import { rutaActividadVoluntario, rutaExpedienteVoluntario } from "./rutas";

// post 

export const createActividadVoluntariado = async (
  { idExpediente, agregarActividades }: { idExpediente: number; agregarActividades: AgregarActividades }
): Promise<AgregarActividades> => {
  const response = await sidnamAPI.post<AgregarActividades>(
    `${rutaExpedienteVoluntario}/${idExpediente}/actividades`,
    agregarActividades
  );
  return response.data;
};

// get 

export const getReporteActividadesVoluntariado = async (idExpediente:number): Promise<Blob> => {
  const response = await sidnamAPI.get(`${rutaExpedienteVoluntario}/${idExpediente}/pdf`, {
    responseType: 'blob', 
  });

  return response.data;
};

// patch

export const patchEditarActividadVoluntario = async (
  { idActividad, actividadEditada }: { idActividad: number; actividadEditada: EditarActividades }
): Promise<EditarActividades> => {
  const response = await sidnamAPI.patch<EditarActividades>(
    `${rutaActividadVoluntario}/${idActividad}`,
    actividadEditada
  );
  return response.data;
}
