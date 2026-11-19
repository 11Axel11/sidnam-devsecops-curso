export interface SolicitudDonacionPreview {
    id: number;
    nombre: string;
    apellido1: string;
    apellido2: string;
    tipoDonacion: string;
    creadoEn: string;
    estado: string;
}

export interface SolicitudDonacionRevision {
    id: number;
    cedula: string;
    nombre: string;
    apellido1: string;
    apellido2: string;
    telefono: string;
    email: string;
    anonimo: boolean;
    descripcion: string;
    tipoDonacion: string;
    observaciones: string;
    estado: string;
    creadoEn: string;
}

export interface RegistroDonacion extends SolicitudDonacionRevision {
    aprobadaPor: string;
    aprobadaEn: string;
    recibida: boolean;
    recibidaEn: string;
    recibidaPor: string;
}