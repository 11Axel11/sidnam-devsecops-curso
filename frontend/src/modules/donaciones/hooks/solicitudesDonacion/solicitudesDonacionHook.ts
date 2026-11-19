import { getEstadosSolicitudesDonacion, getPreviewSolicitudDonacion, getSolicitudesDonacionPorId, getSolicitudesDonacionPorEstado, patchCambiarEstadoSolicitudDonacion } from "@/modules/donaciones/services/solicitudDonacionService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

//gets

export function useGetPreviewSolicitudDonacion(
  page?: number,
  limit?: number
) {
  const { data, isLoading, error, isPlaceholderData, isFetching } = useQuery({
    queryKey: ["solicitudesDonacion", page, limit],
    queryFn: () => getPreviewSolicitudDonacion(page, limit),
    select: (resp) => ({
      solicitudesDonacion: resp.data,
      total: resp.total,
    }),
  });

  return {
    solicitudesDonacion: data?.solicitudesDonacion ?? [],
    totalSolicitudesDonacion: data?.total ?? 0,
    loadingSolicitudesDonacion: isLoading,
    fetchingSolicitudesDonacion: isFetching,
    errorSolicitudesDonacion: error,
    isPlaceholderData,
  };
}

export function useGetSolicitudesDonacionPorId(id: number) {
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["solicitudesDonacion"],
    queryFn: () => getSolicitudesDonacionPorId(id),
  });

  return {
    solicitudDonacion: data,
    loadingSolicitudDonacion: isLoading,
    fetchingSolicitudDonacion: isFetching,
    errorSolicitudDonacion: error,
  };
}

export function useGetEstadosSolicitudesDonacion() {
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["estadoSolicitudesDonacion"],
    queryFn: () => getEstadosSolicitudesDonacion(),
  });

  return {
    estadosSolicitudesDonacion: data,
    loadingEstadosSolicitudesDonacion: isLoading,
    fetchingEstadosSolicitudesDonacion: isFetching,
    errorEstadosSolicitudesDonacion: error,
  };
}

export function useGetSolicitudesDonacionPorEstado(
  idEstado: number,
  page?: number,
  limit?: number,
  options?: { enabled?: boolean }
) {
  const { data, isLoading, error, isPlaceholderData, isFetching } = useQuery({
    queryKey: ["solicitudesDonacion", idEstado, page, limit],
    queryFn: () => getSolicitudesDonacionPorEstado(idEstado, page, limit),
    select: (resp) => ({
      solicitudDonacionEstados: resp.data,
      total: resp.total,
    }),
    enabled: options?.enabled,
  });

  return {
    solicitudesDonacionPorEstado: data?.solicitudDonacionEstados ?? [],
    totalSolicitudesDonacionPorEstado: data?.total ?? 0,
    loadingSolicitudesDonacionPorEstado: isLoading,
    fetchingSolicitudesDonacionPorEstado: isFetching,
    errorSolicitudesDonacionPorEstado: error,
    isPlaceholderData,
  };
}

//post

//export const usePostSolicitudDonacion = () => {
//  return useMutation({
//    mutationFn: ({
//      idUsuario,
//      solicitud,
//    }: {
//      idUsuario: number;
//      solicitud: CrearExpedienteVoluntario;
//    }) => postExpedienteVoluntario({ idUsuario, solicitud }),
//  });
//};

//patch

export const useCambiarEstadoSolicitudDonacion = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: patchCambiarEstadoSolicitudDonacion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["solicitudesDonacion"] });
    },
  });

  return mutation;
};
