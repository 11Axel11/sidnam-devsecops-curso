import sidnamAPI from "@/api/apiConfig";
import { statusDe } from "@/utils/apiError";
import { rutaAntecedentesTraumaticos, rutaExpedientes, rutaValoraciones } from "../rutas";
import type {
  AntecedenteTraumaticoPayload, AntecedenteTraumaticoValoracion,
  AntecedentePersonalInput, AntecedentePersonalValoracion, Valoracion, ValoracionDetalle, ValoracionPayload,
} from "../models/valoracion";

const base = (expedienteId: number) => `${rutaExpedientes}/${expedienteId}${rutaValoraciones}`;

export const getHistorialValoraciones = async (expedienteId: number): Promise<Valoracion[]> =>
  (await sidnamAPI.get<Valoracion[]>(base(expedienteId))).data;

// 404 = el expediente no tiene valoración vigente: es un estado normal, no un error.
export const getValoracionVigente = async (expedienteId: number): Promise<ValoracionDetalle | null> => {
  try {
    return (await sidnamAPI.get<ValoracionDetalle>(`${base(expedienteId)}/vigente`)).data;
  } catch (err) {
    if (statusDe(err) === 404) return null;
    throw err;
  }
};

export const getValoracionDetalle = async (id: number): Promise<ValoracionDetalle> =>
  (await sidnamAPI.get<ValoracionDetalle>(`${rutaValoraciones}/${id}`)).data;

export const postValoracion = async ({ expedienteId, body }: { expedienteId: number; body: ValoracionPayload }): Promise<Valoracion> =>
  (await sidnamAPI.post<Valoracion>(base(expedienteId), body)).data;

export const patchValoracion = async ({ id, body }: { id: number; body: ValoracionPayload }): Promise<Valoracion> =>
  (await sidnamAPI.patch<Valoracion>(`${rutaValoraciones}/${id}`, body)).data;

export const patchConfirmarValoracion = async (id: number): Promise<Valoracion> =>
  (await sidnamAPI.patch<Valoracion>(`${rutaValoraciones}/${id}/confirmar`)).data;

export const patchAnularValoracion = async ({ id, motivo }: { id: number; motivo: string }): Promise<Valoracion> =>
  (await sidnamAPI.patch<Valoracion>(`${rutaValoraciones}/${id}/anular`, { motivo })).data;

export const postAntecedentesPersonales = async ({ id, antecedentes }: { id: number; antecedentes: AntecedentePersonalInput[] }): Promise<AntecedentePersonalValoracion[]> =>
  (await sidnamAPI.post<AntecedentePersonalValoracion[]>(`${rutaValoraciones}/${id}/antecedentes-personales`, { antecedentes })).data;

export const postAntecedenteTraumatico = async ({ valoracionId, body }: { valoracionId: number; body: AntecedenteTraumaticoPayload }): Promise<AntecedenteTraumaticoValoracion> =>
  (await sidnamAPI.post<AntecedenteTraumaticoValoracion>(`${rutaValoraciones}/${valoracionId}${rutaAntecedentesTraumaticos}`, body)).data;

export const patchAntecedenteTraumatico = async ({ id, body }: { id: number; body: AntecedenteTraumaticoPayload }): Promise<AntecedenteTraumaticoValoracion> =>
  (await sidnamAPI.patch<AntecedenteTraumaticoValoracion>(`${rutaAntecedentesTraumaticos}/${id}`, body)).data;

export const patchAnularAntecedenteTraumatico = async ({ id, motivo }: { id: number; motivo: string }): Promise<AntecedenteTraumaticoValoracion> =>
  (await sidnamAPI.patch<AntecedenteTraumaticoValoracion>(`${rutaAntecedentesTraumaticos}/${id}/anular`, { motivo })).data;
