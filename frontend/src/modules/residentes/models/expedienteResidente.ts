import type { EstadoTipo } from "@/models/sharedModels";
import type { CrearResidente, EditarEncargadoResidente, PreviewResidente, Residente } from "./residente";

export interface CrearExpedienteResidente {
  id?: number;
  tipo_pension: number;
  fecha_ingreso: string;
  residente: CrearResidente;
}

export interface ExpedienteResidente {
  id_expediente: number;
  tipo_pension: EstadoTipo;
  fecha_ingreso: string;
  estado: string;
  fecha_cierre?: string;
  usuario_cierre: string;
  residente: Residente;
}

export interface ResumenExpedienteResidente {
  id_expediente: number;
  estado: string;
  residente: ResumenResidente;
}

export interface ResumenResidente {
  id_adulto_mayor: number,
  cedula: string,
  nombre: string,
  apellido1: string,
  apellido2?: string,
  email: string,
  edad: number,
  sexo: string,
  fecha_nacimiento: string
}

export interface EditarExpedienteResidente {
  fecha_ingreso?: string,
  tipo_pension?: EstadoTipo,
  cedula?: string,
  nombre?: string,
  apellido1?: string,
  apellido2?: string,
  sexo?: EstadoTipo,
  edad?: string,
  correo?: string,
  estado_civil?: EstadoTipo,
  dependencia?: EstadoTipo,
  lineaPobreza?: EstadoTipo,
  fecha_nacimiento?: string;
  encargados?: EditarEncargadoResidente[]
}

export const defaultValuesCrearExpedienteResidente = {
  tipo_pension: '',
  fecha_ingreso: '',
  residente: {
    cedula: '',
    nombre: '',
    apellido1: '',
    apellido2: '',
    email: '',
    sexo: '',
    lineaPobreza: '',
    fecha_nacimiento: '',
    edad: '',
    estado_civil: '',
    dependencia: '',
    encargados: [
      {
        cedula: '',
        nombre: '',
        apellido1: '',
        apellido2: '',
        telefono: '',
        correo: '',
      },
    ],
  },
};

export interface PreviewExpedienteResidente {
  id_expediente: number;
  tipo_pension: EstadoTipo;
  fecha_ingreso: string;
  fecha_cierre?: string;
  estado: EstadoTipo;
  residente: PreviewResidente;
}

export const adaptExpedienteResidenteToEditar = (
  expediente: ExpedienteResidente
): EditarExpedienteResidente => {
  const residente = expediente.residente;

  return {
    cedula: residente?.cedula ?? "",
    nombre: residente?.nombre ?? "",
    apellido1: residente?.apellido1 ?? "",
    apellido2: residente?.apellido2 ?? "",
    fecha_nacimiento: residente?.fecha_nacimiento ?? "",
    correo: residente?.email ?? "",
    encargados: (residente?.encargados ?? []).map(e => ({
      id: e.id,
      cedula: e.cedula != null ? String(e.cedula) : undefined,
      nombre: e.nombre ?? "",
      apellido1: e.apellido1 ?? "",
      apellido2: e.apellido2 ?? "",
      correo: e.correo ?? "",
      telefono: e.telefono ?? "",
    })),
  };
};

export interface CrearRegistroSalidaConFamiliar {
  parentesco: string;
  nombre_familiar: string;
  apellido1_familiar: string;
  apellido2_familiar: string;
  fecha_salida: string;
  hora_salida: string;
  fecha_regreso: string;
  hora_regreso: string;
}

export interface ResidenteHeading {
  nombre: string;
  apellido1: string;
  apellido2: string;
  cedula: string;
  sexo: string;
}