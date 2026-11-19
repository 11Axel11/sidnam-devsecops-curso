import sidnamAPI from "@/api/apiConfig";
import type { CrearLibroDeCampo, LibroDeCampoResponse, SalidasConFamiliarResponse } from "../models/enfermeria";
import { rutaBaseExpedientesResidentes, rutaBaseResidentes, rutaExpedienteTSAcciones, rutaLibroCampoTSAcciones } from "./rutas";
import type { EstadoTipo } from "@/models/sharedModels";
import type { CrearRegistroSalidaConFamiliar } from "../models/expedienteResidente";


// get

export const getLibroDeCampo = async (
    idExpediente: number,
    page: number = 1,
    limit: number = 12
): Promise<LibroDeCampoResponse> => {
    const response = await sidnamAPI.get<LibroDeCampoResponse>(`${rutaExpedienteTSAcciones}/${idExpediente}`, {
        params: {
            page,
            limit,
        },
    });
    return response.data;
};


export const getSalidasFamiliares = async (
    idExpediente: number,
    page: number = 1,
    limit: number = 12
): Promise<SalidasConFamiliarResponse> => {
    const response = await sidnamAPI.get<SalidasConFamiliarResponse>(`${rutaBaseExpedientesResidentes}/salidas/${idExpediente}`, {
        params: {
            page,
            limit,
        },
    });
    return response.data;
};

export const getEstadosExpedienteResidente = async (): Promise<EstadoTipo[]> => {
    const response = await sidnamAPI.get<EstadoTipo[]>
    (`${rutaBaseResidentes}/estados-expedientes`);
    return response.data;
};

// post

export const createBitacoraLibroCampo = async (idExpediente: number, nota: CrearLibroDeCampo): Promise<CrearLibroDeCampo> => {
    const response = await sidnamAPI.post<CrearLibroDeCampo>(
        `${rutaExpedienteTSAcciones}/${idExpediente}`,
        nota
    );
    return response.data;
};

export const createBitacoraSalidaConFamiliar = async (idExpediente: number, nota: CrearRegistroSalidaConFamiliar): Promise<CrearRegistroSalidaConFamiliar> => {
    const response = await sidnamAPI.post<CrearRegistroSalidaConFamiliar>(
        `${rutaBaseExpedientesResidentes}/salida/${idExpediente}`,
        nota
    );
    return response.data;
};

// patch

export const patchEditarLibroDeCampo = async (
    { idNota, notaEditada }: { idNota: number; notaEditada: CrearLibroDeCampo }
): Promise<CrearLibroDeCampo> => {

    const response = await sidnamAPI.patch<CrearLibroDeCampo>(
        `${rutaLibroCampoTSAcciones}/${idNota}`,
        notaEditada
    );
    return response.data;
}

export const patchCambiarEstadoExpedienteResidente = async (
    { idEstadoExpediente, idExpediente, idUsuario }: { idEstadoExpediente: number, idExpediente: number, idUsuario:number }
): Promise<{ message: string }> => {
    const response = await sidnamAPI.patch<{ message: string }>(
        `${rutaBaseExpedientesResidentes}/trabajo-social/estado/${idExpediente}/${idEstadoExpediente}/${idUsuario}`
    );
    return response.data;
}