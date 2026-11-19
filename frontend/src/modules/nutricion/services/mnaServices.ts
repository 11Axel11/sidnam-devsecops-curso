import sidnamAPI from "@/api/apiConfig";
import type { EvaluacionMna, FiltrosMna, PayloadMna, VistaPreviaMna } from "../models/mna";
import { rutaEvaluacionesMna, rutaExpedientes } from "../rutas";

const base = (expedienteId: number) => `${rutaExpedientes}/${expedienteId}${rutaEvaluacionesMna}`;

// Por defecto el backend excluye las anuladas; solo se envían los parámetros que aplican. No hay
// `GET /evaluaciones-mna/:id`: el listado ya trae todos los campos.
export const getEvaluacionesMna = async (expedienteId: number, filtros: FiltrosMna): Promise<EvaluacionMna[]> => {
  const params: Record<string, string | boolean> = {};
  if (filtros.desde) params.desde = filtros.desde;
  if (filtros.hasta) params.hasta = filtros.hasta;
  if (filtros.incluirAnulados) params.incluirAnulados = true;
  return (await sidnamAPI.get<EvaluacionMna[]>(base(expedienteId), { params })).data;
};

// Vista previa: mismo cuerpo que el registro, no guarda nada. La `signal` permite abortar la petición
// anterior cuando el usuario sigue contestando.
export const postCalcularMna = async (
  expedienteId: number, body: PayloadMna, signal?: AbortSignal,
): Promise<VistaPreviaMna> => {
  const { data } = await sidnamAPI.post<VistaPreviaMna>(`${base(expedienteId)}/calcular`, body, { signal });
  return { ...data, controlId: typeof body.controlNutricionalId === "number" ? body.controlNutricionalId : null };
};

export const postEvaluacionMna = async (
  { expedienteId, body }: { expedienteId: number; body: PayloadMna },
): Promise<EvaluacionMna> => (await sidnamAPI.post<EvaluacionMna>(base(expedienteId), body)).data;

export const patchAnularEvaluacionMna = async ({ id, motivo }: { id: number; motivo: string }): Promise<EvaluacionMna> =>
  (await sidnamAPI.patch<EvaluacionMna>(`${rutaEvaluacionesMna}/${id}/anular`, { motivo })).data;
