import type { EstadoTipo } from "@/models/sharedModels";

export interface CrearResidente {
  id?: number;
  cedula: string;
  nombre: string;
  apellido1: string;
  apellido2?: string;
  email?: string;
  sexo: string;
  fecha_nacimiento: string;
  lineaPobreza: number;
  edad: number;
  estado_civil: number;
  dependencia: number;
  encargados: EncargadoResidente[];
}
export interface Residente {
  id_adulto_mayor: number;
  cedula: string;
  nombre: string;
  apellido1: string;
  apellido2?: string;
  email: string;
  sexo: string;
  linea_pobreza: EstadoTipo;
  fecha_nacimiento: string;
  edad: number; 
  estado_civil: EstadoTipo;
  dependencia: EstadoTipo;
  encargados: EncargadoResidente[];
}

export interface PreviewResidente {
  id_adulto_mayor: string;
  cedula: string;
  nombre: string;
  apellido1: string;
  apellido2: string;
  dependencia: EstadoTipo;
  fecha_nacimiento: string;
  sexo: string;
}

export interface EncargadoResidente {
  id?: number;
  cedula: string;
  nombre: string;
  apellido1: string;
  apellido2?: string;
  correo?: string;
  telefono: string;
}

export interface EditarEncargadoResidente {
  id?: number;
  cedula?: string;
  nombre?: string;
  apellido1?: string;
  apellido2?: string;
  correo?: string;
  telefono?: string;
}

export interface ResidenteSearchResult {
    firstname: string;
    lastname1: string;
    lastname2: string;
}