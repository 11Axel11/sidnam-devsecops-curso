import sidnamAPI from "@/api/apiConfig";
import { rutaTipoVoluntariado } from "./rutas";
import type { EstadoTipo } from "@/models/sharedModels";

export const postAgregarTipoVoluntariado = async (nombre: string): Promise<EstadoTipo> => {
    const response = await sidnamAPI.post<EstadoTipo>(
      `${rutaTipoVoluntariado}`,
      { nombre }
    );
    return response.data;
  };

export const getTiposVoluntario = async (): Promise<EstadoTipo[]> => {
  const response = await sidnamAPI.get<EstadoTipo[]>(
    `${rutaTipoVoluntariado}`
  );

  return response.data;
};