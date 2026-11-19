import sidnamAPI from "@/api/apiConfig";
import type { EventoImportante, FiltrosEvento, PayloadEvento } from "../models/eventos";
import { rutaEventosImportantes, rutaExpedientes } from "../rutas";

// Por defecto el backend excluye los anulados; solo se envían los parámetros que aplican.
export const getEventos = async (expedienteId: number, filtros: FiltrosEvento): Promise<EventoImportante[]> => {
  const params: Record<string, string | number | boolean> = {};
  if (filtros.desde) params.desde = filtros.desde;
  if (filtros.hasta) params.hasta = filtros.hasta;
  if (filtros.tipoEventoId) params.tipoEventoId = filtros.tipoEventoId;
  if (filtros.incluirAnulados) params.incluirAnulados = true;
  return (await sidnamAPI.get<EventoImportante[]>(`${rutaExpedientes}/${expedienteId}${rutaEventosImportantes}`, { params })).data;
};

export const postEvento = async (
  { expedienteId, body }: { expedienteId: number; body: PayloadEvento },
): Promise<EventoImportante> =>
  (await sidnamAPI.post<EventoImportante>(`${rutaExpedientes}/${expedienteId}${rutaEventosImportantes}`, body)).data;

export const patchAnularEvento = async ({ id, motivo }: { id: number; motivo: string }): Promise<EventoImportante> =>
  (await sidnamAPI.patch<EventoImportante>(`${rutaEventosImportantes}/${id}/anular`, { motivo })).data;
