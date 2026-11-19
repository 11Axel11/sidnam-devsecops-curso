import sidnamAPI from "@/api/apiConfig";
import type { AplicacionTest, FiltrosAplicacion, PayloadAplicacion } from "../models/testMovimiento";
import { rutaAplicacionesTestMovimiento, rutaExpedientes } from "../rutas";

const base = (expedienteId: number) => `${rutaExpedientes}/${expedienteId}${rutaAplicacionesTestMovimiento}`;

// Por defecto el backend excluye las anuladas; solo se envían los parámetros que aplican. El listado ya
// trae los ejercicios de cada aplicación (no hace falta el GET por id).
export const getAplicaciones = async (expedienteId: number, filtros: FiltrosAplicacion): Promise<AplicacionTest[]> => {
  const params: Record<string, string | boolean> = {};
  if (filtros.desde) params.desde = filtros.desde;
  if (filtros.hasta) params.hasta = filtros.hasta;
  if (filtros.incluirAnulados) params.incluirAnulados = true;
  return (await sidnamAPI.get<AplicacionTest[]>(base(expedienteId), { params })).data;
};

export const postAplicacion = async (
  { expedienteId, body }: { expedienteId: number; body: PayloadAplicacion },
): Promise<AplicacionTest> => (await sidnamAPI.post<AplicacionTest>(base(expedienteId), body)).data;

export const patchAnularAplicacion = async ({ id, motivo }: { id: number; motivo: string }): Promise<AplicacionTest> =>
  (await sidnamAPI.patch<AplicacionTest>(`${rutaAplicacionesTestMovimiento}/${id}/anular`, { motivo })).data;
