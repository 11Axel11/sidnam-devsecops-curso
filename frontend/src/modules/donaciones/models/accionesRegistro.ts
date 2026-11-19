import type { Registro } from "./registroDonacion";

export interface CrearRegistroDonacion {
    cedula: string;
    nombre: string;
    apellido1: string;
    apellido2?: string;
    email: string;
    telefono: string;
    anonimo?: boolean;
    tipoDonacion: string;
    descripcion: string;
    observaciones?: string;
}

export const defaultValuesCrearRegistroDonacion = {
    cedula: "",
    nombre: "",
    apellido1: "",
    apellido2: "",
    email: "",
    telefono: "",
    anonimo: false,
    tipoDonacion: "",
    descripcion: "",
    observaciones: "",
}

export interface EditarRegistroDonacion {
    cedula?: string;
    nombre?: string;
    apellido1?: string;
    apellido2?: string;
    email?: string;
    telefono?: string;
    anonimo?: boolean;
    tipoDonacion?: string;
    descripcion?: string;
    observaciones?: string;
}

export const defaultValuesEditarRegistroDonacion = {
    cedula: "",
    nombre: "",
    apellido1: "",
    apellido2: "",
    email: "",
    telefono: "",
    anonimo: false,
    tipoDonacion: "",
    descripcion: "",
    observaciones: "",
}

export const adaptRegistroDonacionToEditar = (registro: Registro): EditarRegistroDonacion => {
    return {
        cedula: registro.donador.cedula ?? "",
        nombre: registro.donador.nombre ?? "",
        apellido1: registro.donador.apellido1 ?? "",
        apellido2: registro.donador.apellido2 ?? "",
        email: registro.donador.email ?? "",
        telefono: registro.donador.telefono ?? "",
        anonimo: registro.anonimo ?? false,
        tipoDonacion: registro.tipoDonacion ?? "",
        descripcion: registro.descripcion ?? "",
        observaciones: registro.observaciones ?? "",
    };
};