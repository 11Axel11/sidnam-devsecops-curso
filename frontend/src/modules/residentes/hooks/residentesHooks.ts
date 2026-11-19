import { useMutation } from "@tanstack/react-query";
import { autofillEncargado, autofillResidente, downloadExpedienteResidente } from "../services/residenteServices";

export function useAutofillResidente() {
    return useMutation({
        mutationFn: async (cedula: string) => {
            return await autofillResidente(cedula);
        },
    });
}

export function useAutofillEncargado() {
    return useMutation({
        mutationFn: async (cedula: string) => {
            return await autofillEncargado(cedula);
        },
    });
}

export function useDescargarExpedienteResidente() {
    return useMutation({
        mutationFn: async (idExpediente: number) => {
            const pdfBlob = await downloadExpedienteResidente(idExpediente);

            const url = window.URL.createObjectURL(pdfBlob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `expediente-${idExpediente}-HogarSanBlas.pdf`;
            document.body.appendChild(link);
            link.click();

            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        },
    });
}