import type { Horario } from "../models/voluntario";


export type HorarioNuevo = Omit<Horario, "id">;