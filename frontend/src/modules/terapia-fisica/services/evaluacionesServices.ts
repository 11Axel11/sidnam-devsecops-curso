import sidnamAPI from "@/api/apiConfig";
import {
  rutaEvaluacionesBarthel, rutaEvaluacionesTinetti, rutaExpedientes,
} from "../rutas";
import type {
  EvaluacionDe, FiltrosEvaluacion, InstrumentoTF, PayloadEvaluacion,
} from "../models/evaluaciones";

const RUTA: Record<InstrumentoTF, string> = {
  barthel: rutaEvaluacionesBarthel,
  tinetti: rutaEvaluacionesTinetti,
};

const base = (i: InstrumentoTF, expedienteId: number) => `${rutaExpedientes}/${expedienteId}${RUTA[i]}`;

// Por defecto el backend excluye las anuladas; solo se envían los parámetros que aplican.
export const getEvaluaciones = async <I extends InstrumentoTF>(
  instrumento: I, expedienteId: number, filtros: FiltrosEvaluacion,
): Promise<EvaluacionDe<I>[]> => {
  const params: Record<string, string | boolean> = {};
  if (filtros.desde) params.desde = filtros.desde;
  if (filtros.hasta) params.hasta = filtros.hasta;
  if (filtros.incluirAnulados) params.incluirAnulados = true;
  return (await sidnamAPI.get<EvaluacionDe<I>[]>(base(instrumento, expedienteId), { params })).data;
};

export const postEvaluacion = async <I extends InstrumentoTF>(
  instrumento: I, { expedienteId, body }: { expedienteId: number; body: PayloadEvaluacion },
): Promise<EvaluacionDe<I>> =>
  (await sidnamAPI.post<EvaluacionDe<I>>(base(instrumento, expedienteId), body)).data;

export const patchAnularEvaluacion = async <I extends InstrumentoTF>(
  instrumento: I, { id, motivo }: { id: number; motivo: string },
): Promise<EvaluacionDe<I>> =>
  (await sidnamAPI.patch<EvaluacionDe<I>>(`${RUTA[instrumento]}/${id}/anular`, { motivo })).data;
