import type { EstadoTipo } from "@/models/sharedModels";
import type { Voluntario, Horario, Actividades } from "./voluntario";

export interface ExpedienteVoluntarioPreview {
  id: number;
  voluntario: VoluntarioPreview,
  estado?: string
}

export interface VoluntarioPreview {
  cedula: string;
  nombre: string;
  apellido1: string;
  apellido2: string;
}

export interface Expediente {
  id: number;
  datosExtra: string;
  observaciones: string;
  voluntario: Voluntario;
  horarios: Horario[];
  actividades: Actividades[];
  tipoVoluntariado: EstadoTipo;
  estado?: string;
  cantidadHoras: number;
  progreso_horas?: number;
}
