export interface RegistroDonacionPreview {
    id: number;
    creadoEn: string;
    tipoDonacion: string;
    donador: DonadorPreview;
    recibida: boolean;
    aprobadaEn: string;
}

export interface DonadorPreview {
    nombre: string;
    apellido1: string;
    apellido2: string;
}

export interface Donador {
    id: number;
    nombre: string;
    apellido1: string;
    apellido2: string;
    cedula: string;
    telefono: string;
    email: string;
}

export interface Registro {
    id: number;
    creadoEn: string;
    tipoDonacion: string;
    descripcion: string;
    donador: Donador;
    anonimo: boolean;
    aprobadaPor: string;
    aprobadaEn: string;
    recibida: boolean;
    recibidaEn: string;
    recibidaPor: string;
    observaciones: string;
}

export interface RegistroPorSolicitud{
    message: string,
    data: {
        id: number
    }
} 

export interface FiltrarRegistrosParams {
  search?: string;
  recibida?: string;
  fechaInicio?: string;
  fechaFin?: string;
  page?: number;
  limit?: number;
}