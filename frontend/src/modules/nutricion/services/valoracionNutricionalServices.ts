import sidnamAPI from "@/api/apiConfig";
import { statusDe } from "@/utils/apiError";
import { rutaExpedientes, rutaValoracionesNutricionales } from "../rutas";
import type {
  ValoracionNutricional, ValoracionNutricionalDetalle, ValoracionNutricionalPayload,
} from "../models/valoracionNutricional";

const base = (expedienteId: number) => `${rutaExpedientes}/${expedienteId}${rutaValoracionesNutricionales}`;

export const getHistorialValoracionesNutricionales = async (expedienteId: number): Promise<ValoracionNutricional[]> =>
  (await sidnamAPI.get<ValoracionNutricional[]>(base(expedienteId))).data;

// 404 = el expediente no tiene valoración vigente: es un estado normal, no un error.
export const getValoracionNutricionalVigente = async (expedienteId: number): Promise<ValoracionNutricionalDetalle | null> => {
  try {
    return (await sidnamAPI.get<ValoracionNutricionalDetalle>(`${base(expedienteId)}/vigente`)).data;
  } catch (err) {
    if (statusDe(err) === 404) return null;
    throw err;
  }
};

export const getValoracionNutricionalDetalle = async (id: number): Promise<ValoracionNutricionalDetalle> =>
  (await sidnamAPI.get<ValoracionNutricionalDetalle>(`${rutaValoracionesNutricionales}/${id}`)).data;

export const postValoracionNutricional = async ({ expedienteId, body }: { expedienteId: number; body: ValoracionNutricionalPayload }): Promise<ValoracionNutricional> =>
  (await sidnamAPI.post<ValoracionNutricional>(base(expedienteId), body)).data;

export const patchValoracionNutricional = async ({ id, body }: { id: number; body: ValoracionNutricionalPayload }): Promise<ValoracionNutricional> =>
  (await sidnamAPI.patch<ValoracionNutricional>(`${rutaValoracionesNutricionales}/${id}`, body)).data;

export const patchConfirmarValoracionNutricional = async (id: number): Promise<ValoracionNutricional> =>
  (await sidnamAPI.patch<ValoracionNutricional>(`${rutaValoracionesNutricionales}/${id}/confirmar`)).data;

export const patchAnularValoracionNutricional = async ({ id, motivo }: { id: number; motivo: string }): Promise<ValoracionNutricional> =>
  (await sidnamAPI.patch<ValoracionNutricional>(`${rutaValoracionesNutricionales}/${id}/anular`, { motivo })).data;
