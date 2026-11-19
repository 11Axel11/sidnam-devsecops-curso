import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CrearExpedienteVoluntario } from "../../models/accionesExpediente";
import { getEstadosSolicitudesVoluntario, getPreviewSolicitudVoluntario, getSolicitudesVoluntarioPorEstado, getSolicitudesVoluntarioPorId, patchCambiarEstadoSolicitudVoluntariado } from "../../services/solicitudesVoluntariadoServices";
import { createExpedienteVoluntario } from "../../services/expedientesVoluntarios";

// get

export function useGetPreviewSolicitudVoluntario(
  page?: number,
  limit?: number
) {
  const { data, isLoading, error, isPlaceholderData, isFetching } = useQuery({
    queryKey: ["solicitudesVoluntario", page, limit],
    queryFn: () => getPreviewSolicitudVoluntario(page, limit),
    select: (resp) => ({
      solicitudesVoluntariado: resp.data,
      total: resp.total,
    }),
  });

  return {
    solicitudesVoluntariado: data?.solicitudesVoluntariado ?? [],
    totalSolicitudesVoluntariado: data?.total ?? 0,
    loadingSolicitudesVoluntariado: isLoading,
    fetchingSolicitudesVoluntariado: isFetching,
    errorSolicitudesVoluntariado: error,
    isPlaceholderData,
  };
}

export function useGetSolicitudesVoluntarioPorId(id: number) {
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["solicitudesVoluntario"],
    queryFn: () => getSolicitudesVoluntarioPorId(id),
  });

  return {
    solicitudVoluntariado: data,
    loadingSolicitudVoluntariado: isLoading,
    fetchingSolicitudVoluntariado: isFetching,
    errorSolicitudVoluntariado: error,
  };
}

export function useGetEstadosSolicitudesVoluntario() {
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["estadoSolicitudesVoluntario"],
    queryFn: () => getEstadosSolicitudesVoluntario(),
  });

  return {
    estadosSolicitudesVoluntariado: data,
    loadingEstadosSolicitudesVoluntariado: isLoading,
    fetchingEstadosSolicitudesVoluntariado: isFetching,
    errorEstadosSolicitudesVoluntariado: error,
  };
}

export function useGetSolicitudesVoluntarioPorEstado(
  idEstado: number,
  page?: number,
  limit?: number,
  options?: { enabled?: boolean }
) {
  const { data, isLoading, error, isPlaceholderData, isFetching } = useQuery({
    queryKey: ["solicitudesVoluntario", idEstado, page, limit],
    queryFn: () => getSolicitudesVoluntarioPorEstado(idEstado, page, limit),
    select: (resp) => ({
      solicitudVoluntariadoEstados: resp.data,
      total: resp.total,
    }),
    enabled: options?.enabled,
  });

  return {
    solicitudesVoluntariadoPorEstado: data?.solicitudVoluntariadoEstados ?? [],
    totalSolicitudesVoluntariadoPorEstado: data?.total ?? 0,
    loadingSolicitudesVoluntariadoPorEstado: isLoading,
    fetchingSolicitudesVoluntariadoPorEstado: isFetching,
    errorSolicitudesVoluntariadoPorEstado: error,
    isPlaceholderData,
  };
}

// post

export const usePostSolicitudVoluntario = () => {
  return useMutation({
    mutationFn: ({
      idUsuario,
      solicitud,
    }: {
      idUsuario: number;
      solicitud: CrearExpedienteVoluntario;
    }) => createExpedienteVoluntario({ idUsuario, solicitud }),
  });
};

// patch

export const useCambiarEstadoSolicitudVoluntariado = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: patchCambiarEstadoSolicitudVoluntariado,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["solicitudesVoluntario"] });
    },
  });

  return mutation;
};
