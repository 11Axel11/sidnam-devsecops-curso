import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createBitacoraLibroCampo, createBitacoraSalidaConFamiliar, getEstadosExpedienteResidente, getLibroDeCampo, getSalidasFamiliares, patchCambiarEstadoExpedienteResidente, patchEditarLibroDeCampo } from "../../services/trabajoSocialServices";
import type { CrearLibroDeCampo, GetSalidasOngoingDto } from "../../models/enfermeria";
import { keepPreviousData } from "@tanstack/react-query";
import type { CrearRegistroSalidaConFamiliar } from "../../models/expedienteResidente";

// get

export function useGetLibroDeCampo(id: number, page: number = 1, limit: number = 12, enabled: boolean = true) {
  const { data, isLoading, error, isPlaceholderData } = useQuery({
    queryKey: ['bitacoraTS', id, page, limit],
    queryFn: () => getLibroDeCampo(id, page, limit),
    placeholderData: keepPreviousData,
    enabled: enabled && id > 0,
  });

  return {
    BitacorasLibroDeCampo: data?.data ?? [],
    totalBitacorasLibroDeCampo: data?.total ?? 0,
    loadingBitacorasLibroDeCampo: isLoading,
    errorBitacorasLibroDeCampo: error,
    isPlaceholderData,
  };
}

export function useGetSalidasFamiliares(id: number, page: number = 1, limit: number = 12, enabled: boolean = true) {
  const { data, isLoading, error, isPlaceholderData } = useQuery({
    queryKey: ['salidasFamiliares', id, page, limit],
    queryFn: () => getSalidasFamiliares(id, page, limit),
    placeholderData: keepPreviousData,
    enabled: enabled && id > 0,
  });

  return {
    salidaOngoing: isSalidasOngoingDto(data?.ongoing) ? data.ongoing : null,
    salidasFamiliares: data?.historial.data ?? [],
    totalSalidasFamiliares: data?.historial.total ?? 0,
    loadingSalidasFamiliares: isLoading,
    errorSalidasFamiliares: error,
    isPlaceholderData,
  };
}

function isSalidasOngoingDto(value: unknown): value is GetSalidasOngoingDto {
  return typeof value === "object" && value !== null && "id_salida" in value;
}


export function useGetEstadosExpedienteResidente() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['estadosExpedienteResidente'],
    queryFn: () => getEstadosExpedienteResidente()
  });

  return {
    EstadosExpedienteResidente: data,
    loadingEstadosExpedienteResidente: isLoading,
    errorEstadosExpedienteResidente: error
  };
}


// post
export function useCreateLibroDeCampo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ idExpediente, nota }: { idExpediente: number; nota: CrearLibroDeCampo }) =>
      createBitacoraLibroCampo(idExpediente, nota),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['bitacoraTS', variables.idExpediente]
      });
    },
  });
}
export function useCreateSalidaConFamiliar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ idExpediente, nota }: { idExpediente: number; nota: CrearRegistroSalidaConFamiliar }) =>
      createBitacoraSalidaConFamiliar(idExpediente, nota),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['salidasFamiliares', variables.idExpediente]
      });
    },
  });
}

// patch


export const useEditLibroDeCampo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { idNota: number; notaEditada: CrearLibroDeCampo }) =>
      patchEditarLibroDeCampo(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["bitacoraTS"],
      });
    },
  });
};





export const useEditEstadoExpedienteResidente = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: patchCambiarEstadoExpedienteResidente,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["expedienteResidenteId", variables.idExpediente],
      });
      queryClient.invalidateQueries({
        queryKey: ["expedienteResidenteResumenId", variables.idExpediente],
      });
    },
  });

  return mutation;
};
