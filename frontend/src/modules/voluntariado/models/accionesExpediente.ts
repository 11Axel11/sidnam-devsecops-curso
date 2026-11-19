import type { EditarHorario } from "../types/editarVoluntarioProps";
import type { Expediente } from "./expedienteVoluntario";
import type { ContactosEmergenciaVoluntariado, Horario } from "./voluntario";

export interface CrearExpedienteVoluntario {
  cedula: string;
  nombre: string;
  apellido1: string;
  apellido2?: string;
  email: string;
  telefono: string;
  ocupacion: string;
  direccion: string;
  sexo: string;
  experienciaLaboral: string;
  tipoVoluntariado: number;
  contactosEmergencia: ContactosEmergenciaVoluntariado[];
  horarios?: Horario[];
  observaciones?: string;
  cantidadHoras: number;
}

export const defaultValuesSolicitudVoluntariado = {
  cedula: '',
  nombre: '',
  apellido1: '',
  apellido2: '' ,
  email: '',
  telefono: '',
  ocupacion: '',
  direccion: '',
  sexo: '',
  experienciaLaboral: '',
  tipoVoluntariado: 0,
  contactosEmergencia: [{ nombre: "", telefono: "" }],
  horarios: [{ dia: "", horaInicio: "", horaFin: "" }],
  observaciones: '',
  cantidadHoras: 0 ,
};

export interface AgregarActividades {
  fecha: string;
  cantidadHoras: number;
  actividades: string;

}


export const defaultValuesEditarExpediente = {
  cedula: '',
  nombre: '',
  apellido1: '',
  apellido2: '',
  email: '',
  telefono: '',
  ocupacion: '',
  direccion: '',
  sexo: '',
  experienciaLaboral: '',
  contactosEmergencia: [{ nombre: "", telefono: "" }],
  observaciones: '',
  cantidadHoras: ''
};

export const adaptExpedienteToEditar = (expediente: Expediente): EditarExpediente => {
  const voluntario = expediente.voluntario;

  return {
    cedula: voluntario?.cedula ?? '',
    nombre: voluntario?.nombre ?? "",
    apellido1: voluntario?.apellido1 ?? "",
    apellido2: voluntario?.apellido2 ?? "",
    email: voluntario?.email ?? "",
    telefono: voluntario?.telefono ?? "",
    ocupacion: voluntario?.ocupacion ?? "",
    direccion: voluntario?.direccion ?? "",
    cantidadHoras: String(expediente.cantidadHoras ?? 0),
    sexo: voluntario?.sexo ?? "",
    experienciaLaboral: voluntario?.experienciaLaboral ?? "",
    contactosEmergencia: voluntario?.contactosEmergencia ?? [],
    observaciones: expediente.observaciones ?? "",
    horarios: expediente.horarios ?? [],  
  };
};

export interface EditarExpediente {
  cedula?: string;
  nombre?: string;
  apellido1?: string;
  apellido2?: string;
  email?: string;
  telefono?: string;
  ocupacion?: string;
  direccion?: string;
  cantidadHoras?: string;
  sexo?: string;
  experienciaLaboral?: string;
  contactosEmergencia?: ContactosEmergenciaVoluntariado[];
  horarios?: EditarHorario[];
  observaciones?: string;
}
export interface EditarActividades {
  id?:string;
  fecha?: string;
  cantidadHoras?: number;
  actividades?: string;
}
