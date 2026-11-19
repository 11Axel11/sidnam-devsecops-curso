import sidnamAPI from "@/api/apiConfig";
import type { AreaProveedor, BuscarFactura, CrearAreaProveedor, CrearFactura, CrearProveedor, EditarFactura, EditarProveedor, Factura, Proveedores, ProveedorPreview } from "../models/proveedores";
import { rutaBaseProveeduria } from "./rutas";
import type { EstadoTipo } from "@/models/sharedModels";
import type { Sede } from "@/store/sedeStore";

export const createAreaProveedor = async (
    { area }: { area: CrearAreaProveedor }
): Promise<CrearAreaProveedor> => {
    const response = await sidnamAPI.post<CrearAreaProveedor>(
        `${rutaBaseProveeduria}/areas`,
        area
    );
    return response.data;
};

export const createProveedor = async (
    { proveedor }: { proveedor: CrearProveedor }
): Promise<CrearProveedor> => {
    const response = await sidnamAPI.post<CrearProveedor>(
        `${rutaBaseProveeduria}/proveedores`,
        proveedor
    );
    return response.data;
};

export const createFactura = async (
    { factura }: { factura: CrearFactura }
): Promise<CrearFactura> => {
    const response = await sidnamAPI.post<CrearFactura>(
        `${rutaBaseProveeduria}/facturas`,
        factura
    );
    return response.data;
};


// get

export const getAreasProveedores = async (page: number, limit: number):
    Promise<{
        data: AreaProveedor[];
        total: number;
    }> => {
    const response = await sidnamAPI.get<
        {
            data: AreaProveedor[];
            total: number;
        }>
        (`${rutaBaseProveeduria}/areas/activas?page=${page}&limit=${limit}`);
    return response.data;
};


export const getProveedores = async (idArea: string): Promise<Proveedores[]> => {
    const response = await sidnamAPI.get<Proveedores[]>
        (`${rutaBaseProveeduria}/proveedores/area/${idArea}`);
    return response.data;
};

export const getFacturasPorProveedor = async (idProveedor: string, page: number, limit: number):
    Promise<{
        data: Factura[];
        total: number;
    }> => {
    const response = await sidnamAPI.get<
        {
            data: Factura[];
            total: number;
        }>
        (`${rutaBaseProveeduria}/facturas/proveedor/${idProveedor}?page=${page}&limit=${limit}`);
    return response.data;
};


export const getAreaById = async (idArea: string):
    Promise<AreaProveedor> => {
    const response = await sidnamAPI.get<
        AreaProveedor>
        (`${rutaBaseProveeduria}/areas/id/${idArea}`);
    return response.data;
};



export const getProveedoresPorNombre = async (nombre: string): Promise<Proveedores[]> => {
    const response = await sidnamAPI.get<Proveedores[]>(
        `${rutaBaseProveeduria}/proveedores/filtrar-nombre?filtro=${nombre}`
    );

    return response.data;
};

export const getFacturasPorNumero = async (numero: string): Promise<BuscarFactura | BuscarFactura[] | null> => {
    if (!numero.trim()) {
        return null;
    }
    const response = await sidnamAPI.get<BuscarFactura[]>(
        `${rutaBaseProveeduria}/facturas/numero/${numero}`
    );
    return response.data;
};

export const getFacturas = async (page?: number, limit?: number, estado?: number, sede?: "hogar" | "cecuidam"):
    Promise<{
        data: Factura[];
        total: number;
    }> => {

    const response = await sidnamAPI.get<
        {
            data: Factura[];
            total: number;
        }>
        (`${rutaBaseProveeduria}/facturas`, { params: { page, limit, estado, ...(sede ? { sede } : {}) } });
    return response.data;
};

export const getFacturaPdf = async (idFactura: number): Promise<Blob> => {
    const response = await sidnamAPI.get(`${rutaBaseProveeduria}/facturas/${idFactura}/pdf`, { responseType: "blob" });
    return response.data;
};

export const getProveedoresArchivados = async (idArea: number): Promise<Proveedores[]> => {
    const response = await sidnamAPI.get<Proveedores[]>(
        `${rutaBaseProveeduria}/proveedores/archivados/${idArea}`
    );
    return response.data;
};

export const getProveedoresPreview = async (): Promise<ProveedorPreview[]> => {
    const response = await sidnamAPI.get<ProveedorPreview[]>(
        `${rutaBaseProveeduria}/proveedores/activos`
    );
    return response.data;
};


export const getEstadosFacturas = async (): Promise<EstadoTipo[]> => {
    const response = await sidnamAPI.get<EstadoTipo[]>(
        `${rutaBaseProveeduria}/facturas/estados`
    );
    return response.data;
};


export const getReporteFacturasPorMesYEstado = async (anio: number, mes: number, estado: number, sede?: Sede): Promise<Blob> => {
    const params: Record<string, string | number> = { anio, mes, estado };
    if (sede) params.sede = sede;
    const response = await sidnamAPI.get(
        `${rutaBaseProveeduria}/reportes/pdf`,
        { params, responseType: 'blob' }
    );
    return response.data;
};

// patch 

export const patchFactura = async (
    { factura, idFactura }: { factura: EditarFactura, idFactura: number }
): Promise<EditarFactura> => {
    const response = await sidnamAPI.patch<EditarFactura>(
        `${rutaBaseProveeduria}/facturas/${idFactura}`,
        factura
    );
    return response.data;
};

export const patchEstadoFactura = async (
    { idFactura, fecha_pagada }: { idFactura: number; fecha_pagada?: string }
): Promise<{ message: string }> => {
    const response = await sidnamAPI.patch<{ message: string }>(
        `${rutaBaseProveeduria}/facturas/estado/${idFactura}`,
        fecha_pagada ? { fecha_pagada } : undefined
    );
    return response.data;
};

export const patchProveedor = async (
    { proveedor, idProveedor }: { proveedor: EditarProveedor, idProveedor: number }
): Promise<EditarProveedor> => {
    const response = await sidnamAPI.patch<EditarProveedor>(
        `${rutaBaseProveeduria}/proveedores/${idProveedor}`,
        proveedor
    );
    return response.data;
};

export const patchEstadoProveedor = async (
    { idProveedor }: { idProveedor: number }
): Promise<{ message: string }> => {
    const response = await sidnamAPI.patch<{ message: string }>(
        `${rutaBaseProveeduria}/proveedor/handleArchivado/${idProveedor}`
    );
    return response.data;
};
