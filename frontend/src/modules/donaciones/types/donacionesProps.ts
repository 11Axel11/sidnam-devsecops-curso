import type { Registro, RegistroDonacionPreview } from "../models/registroDonacion"
import type { SolicitudDonacionRevision } from "../models/solicitudDonacion"

export type solicitudDonacionProps = {
    variant: "solicitud",
    solicitud: SolicitudDonacionRevision
}

export type registroDonacionProps = {
    variant: "registro",
    registro: Registro
}

export interface DonacionCardData {
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
    aprobadaPor: string;
    aprobadaEn: string;
    recibida: boolean;
    recibidaEn: string;
    recibidaPor: string;
}

export const adaptSolicitudDonacionToCardData = (
    solicitud: SolicitudDonacionRevision
): DonacionCardData => ({
    ...solicitud,
    aprobadaPor: "",
    aprobadaEn: "",
    recibida: false,
    recibidaEn: "",
    recibidaPor: ""
});

export const adaptRegistroDonacionToCardData = (
    registro: Registro
): DonacionCardData => ({
    id: registro.id,
    cedula: registro.donador.cedula,
    nombre: registro.donador.nombre,
    apellido1: registro.donador.apellido1,
    apellido2: registro.donador.apellido2,
    telefono: registro.donador.telefono,
    email: registro.donador.email, // Using email instead of correo to match API response
    anonimo: registro.anonimo,
    descripcion: registro.descripcion,
    tipoDonacion: registro.tipoDonacion,
    observaciones: registro.observaciones,
    estado: "aprobada",
    creadoEn: registro.creadoEn,
    aprobadaPor: registro.aprobadaPor,
    aprobadaEn: registro.aprobadaEn,
    recibida: registro.recibida,
    recibidaEn: registro.recibidaEn,
    recibidaPor: registro.recibidaPor
});

export type cardVistaDonacionProps =
  | { variant: "solicitud"; solicitud: SolicitudDonacionRevision }
  | { variant: "registro"; registro: Registro };

export type registroDonacionPreviewProps = {
    registro: RegistroDonacionPreview,
    clickAction: (id: number) => void
}