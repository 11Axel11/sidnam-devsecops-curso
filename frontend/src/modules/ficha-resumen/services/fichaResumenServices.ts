import sidnamAPI from "@/api/apiConfig";
import type { FichaResumen } from "../models/fichaResumen";

export const getFichaResumen = async (expedienteId: number): Promise<FichaResumen> =>
  (await sidnamAPI.get<FichaResumen>(`/expedientes/${expedienteId}/ficha-resumen`)).data;
