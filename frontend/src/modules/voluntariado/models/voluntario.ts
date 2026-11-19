import type { EstadoTipo } from "@/models/sharedModels";

export interface Horario {
  id: number;
  dia: string;
  horaInicio: string;
  horaFin: string;
}

export interface ContactosEmergenciaVoluntariado {
  id: number;
  nombre: string;
  telefono: string;
}

export interface Voluntario {
  id: number;
  cedula: string;
  nombre: string;
  apellido1: string;
  apellido2: string;
  email: string;
  telefono: string;
  ocupacion: string;
  direccion: string;
  sexo: string;
  experienciaLaboral: string;
  tipoVoluntariado: EstadoTipo[];
  creadoEn: string;
  contactosEmergencia: ContactosEmergenciaVoluntariado[];
}

export interface Actividades {
  id: number;
  fecha: string;
  cantidadHoras: number;
  actividades: string;
}
