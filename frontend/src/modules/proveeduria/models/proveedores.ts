export interface CrearAreaProveedor {
    nombre: string;
}

export interface AreaProveedor{
    id_area: string;
    nombre: string;
}

export interface CrearProveedor {
    nombre: string;
    numero_proveedor: string;
    email: string;
    direccion: string;
    id_area: number;
}

export interface Proveedores {
    id_proveedor: string;
    nombre: string;
    numero: number;
    direccion: string;
    correo: string;
    area: AreaProveedor;
}

export interface ProveedorPreview {
    id_proveedor: string;
    nombre: string;
}

export interface CrearFactura {
    sede: "hogar" | "cecuidam";
    proveedor_id: number;
    numero_factura: number;
    fecha_emision: string;
    fecha_pago: string;
    monto: number;
}

export interface Factura{
    id_factura: number;
    sede?: "hogar" | "cecuidam";
    fecha_pagada?: string | null;
    proveedor?: { id_proveedor: number | string; nombre: string };
    numero_factura: number;
    fecha_emitida: string;
    fecha_pago: string;
    monto: number;
    estado: string;
}
export interface BuscarFactura {
    id_factura: number;
    numero_factura: number;
    fecha_emitida: string;
    fecha_pago: string;
    monto: number;
    estado: string;
    proveedor: Proveedores
}


export interface EditarFactura {
    numero_factura?: string;
    fecha_emitida?: string;
    fecha_pago?: string;
    monto?: string;
}

export interface defaultValuesFactura {
    numero_factura?: string;
    fecha_emitida?: string;
    fecha_pago?: string;
    monto: string;
}

export interface EditarProveedor {
    nombre?: string;
    numero?: number;
    direccion?: string;
    correo?: string;
}

export interface defaultValuesProveedor {
    nombre?: string;
    numero?: number;
    direccion?: string;
    correo?: string;
}
