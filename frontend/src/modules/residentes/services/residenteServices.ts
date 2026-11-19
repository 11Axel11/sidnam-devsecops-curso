import sidnamAPI from "@/api/apiConfig";
import { rutaBaseExpedientesResidentes, rutaBaseResidentes } from "./rutas";
import type { ResidenteSearchResult } from "../models/residente";

export const autofillResidente = async (cedula: string): Promise<ResidenteSearchResult | null> => {
    const response = await sidnamAPI.get<ResidenteSearchResult | null>(
        `${rutaBaseResidentes}/autocompletado/cedula/${cedula}`
    );

    return response.data;
};

export const autofillEncargado = async (cedula: string): Promise<ResidenteSearchResult> => {
    const response = await sidnamAPI.get<ResidenteSearchResult>(
        `${rutaBaseResidentes}/autocompletadoEncargado/cedula/${cedula}`
    );

    return response.data;
};

export const downloadExpedienteResidente = async (idExpediente: number): Promise<Blob> => {
    const response = await sidnamAPI.get(`${rutaBaseExpedientesResidentes}/${idExpediente}/pdf`, {
        responseType: 'blob',
    });

    return response.data;
};