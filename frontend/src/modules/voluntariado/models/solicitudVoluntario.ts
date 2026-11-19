import type { Horario, ContactosEmergenciaVoluntariado } from "./voluntario";

export interface SolicitudVoluntariadoPreview {
  id: number;
  nombre: string;
  apellido1: string;
  apellido2: string;
  creadoEn: string;
  estado: string;
}

export interface SolicitudVoluntariadoRevision {
  id: number;
  cedula: number;
  nombre: string;
  apellido1: string;
  apellido2: string;
  email: string;
  telefono: number;
  ocupacion: string;
  direccion: string;
  sexo: string;
  experienciaLaboral: string;
  tipoVoluntariado: number;
  horarios: Horario[];
  observaciones: string;
  creadoEn: string;
  estado: string;
  contactosEmergencia: ContactosEmergenciaVoluntariado[];
}

export interface ExpedienteVoluntario extends SolicitudVoluntariadoRevision {
  actividades: string[];
  contactosEmergencia: ContactosEmergenciaVoluntariado[];
}
