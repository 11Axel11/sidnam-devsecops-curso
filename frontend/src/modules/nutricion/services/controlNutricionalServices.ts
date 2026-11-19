import sidnamAPI from "@/api/apiConfig";
import { rutaControlesNutricionales, rutaExpedientes } from "../rutas";
import type {
  ControlNutricional, ControlNutricionalFila, ControlNutricionalPayload, FiltrosControl,
} from "../models/controlNutricional";

const base = (expedienteId: number) => `${rutaExpedientes}/${expedienteId}${rutaControlesNutricionales}`;

// Por defecto el backend excluye los anulados; solo se envían los parámetros que aplican.
export const getControlesNutricionales = async (expedienteId: number, filtros: FiltrosControl): Promise<ControlNutricionalFila[]> => {
  const params: Record<string, string | boolean> = {};
  if (filtros.desde) params.desde = filtros.desde;
  if (filtros.hasta) params.hasta = filtros.hasta;
  if (filtros.incluirAnulados) params.incluirAnulados = true;
  return (await sidnamAPI.get<ControlNutricionalFila[]>(base(expedienteId), { params })).data;
};

export const postControlNutricional = async ({ expedienteId, body }: { expedienteId: number; body: ControlNutricionalPayload }): Promise<ControlNutricional> =>
  (await sidnamAPI.post<ControlNutricional>(base(expedienteId), body)).data;

export const patchAnularControlNutricional = async ({ id, motivo }: { id: number; motivo: string }): Promise<ControlNutricional> =>
  (await sidnamAPI.patch<ControlNutricional>(`${rutaControlesNutricionales}/${id}/anular`, { motivo })).data;
