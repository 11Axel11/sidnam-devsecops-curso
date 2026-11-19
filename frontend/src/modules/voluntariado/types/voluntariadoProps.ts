import type { Expediente, ExpedienteVoluntarioPreview } from "../models/expedienteVoluntario";
import type {  SolicitudVoluntariadoRevision, ExpedienteVoluntario,  } from "../models/solicitudVoluntario"
import type { Horario, ContactosEmergenciaVoluntariado, Actividades } from "../models/voluntario";

export type solicitudVoluntariadoProps = {
  variant: "solicitud",
  solicitud: SolicitudVoluntariadoRevision
}

export type expedienteVoluntarioProps = {
  variant: "expediente";
  expediente: ExpedienteVoluntario;
};

export type solicitudVoluntariadoHorarioProps = {
  horario: Horario[]
}

export interface VoluntarioCardData {
  id: number;
  cedula: string | number;
  nombre: string;
  apellido1: string;
  apellido2: string;
  email: string;
  telefono: string | number;
  ocupacion: string;
  direccion: string;
  sexo: string;
  experienciaLaboral: string;
  tipoVoluntariado: number;
  horarios: Horario[];
  observaciones: string;
  creadoEn: string;
  estado: string;
  contactosEmergencia?: ContactosEmergenciaVoluntariado[];
  actividades?: Actividades[];
  datosExtra?: string;
  cantidadHoras?: number;
  progreso_horas?: number;
}

export const adaptSolicitudToCardData = (
  solicitud: SolicitudVoluntariadoRevision
): VoluntarioCardData => ({
  ...solicitud,
});

export const adaptExpedienteToCardData = (
  expediente: Expediente
): VoluntarioCardData => ({
  id: expediente.id,
  cedula: expediente.voluntario.cedula,
  nombre: expediente.voluntario.nombre,
  apellido1: expediente.voluntario.apellido1,
  apellido2: expediente.voluntario.apellido2,
  email: expediente.voluntario.email,
  telefono: expediente.voluntario.telefono,
  ocupacion: expediente.voluntario.ocupacion,
  direccion: expediente.voluntario.direccion,
  sexo: expediente.voluntario.sexo,
  experienciaLaboral: expediente.voluntario.experienciaLaboral,
  tipoVoluntariado: expediente.tipoVoluntariado.id,
  horarios: expediente.horarios,
  observaciones: expediente.observaciones,
  creadoEn: expediente.voluntario.creadoEn,
  estado: "aprobada", 
  contactosEmergencia: expediente.voluntario.contactosEmergencia,
  actividades: expediente.actividades,
  datosExtra: expediente.datosExtra,
  cantidadHoras: expediente.cantidadHoras,
  progreso_horas: expediente.progreso_horas,
});

export type cardVistaVoluntarioProps =
  | { variant: "solicitud"; solicitud: SolicitudVoluntariadoRevision }
  | { variant: "expediente"; expediente: Expediente };

export type expedienteVoluntarioPreviewProps = {
  expediente: ExpedienteVoluntarioPreview, 
  clickAction: (id: number) => void,
  variant?: "default" | "historial"
}

