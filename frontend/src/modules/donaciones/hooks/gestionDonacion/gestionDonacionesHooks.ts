import { 
  getPreviewRegistroDonaciones, 
  getRegistroDonacionPorId, 
  patchCambiarEstadoARecibido, 
  patchEditarRegistroDonacion, 
  postCrearRegistroDonacion,
  getReporteDonacionesPorMes, 
  getRegistroDonacionPorSolicitud,
  getFiltrarRegistrosDonaciones
} from "@/modules/donaciones/services/gestionDonacionesService";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CrearRegistroDonacion } from "../../models/accionesRegistro";
import type { FiltrarRegistrosParams } from "../../models/registroDonacion";

//gets

export function useGetPreviewRegistroDonaciones(
  page?: number,
  limit?: number
) {
  const { data, isLoading, error, isPlaceholderData, isFetching } = useQuery({
    queryKey: ["registrosDonacion", page, limit],
    queryFn: () => getPreviewRegistroDonaciones(page, limit),
    select: (resp) => ({
      registrosDonacion: resp.data,
      total: resp.total,
    }),
  });

  return {
    registrosDonacion: data?.registrosDonacion ?? [],
    totalRegistrosDonacion: data?.total ?? 0,
    loadingRegistrosDonacion: isLoading,
    fetchingRegistrosDonacion: isFetching,
    errorRegistrosDonacion: error,
    isPlaceholderData,
  };
}

export function useGetRegistroDonacionPorId(id: number) {
  const { data, isLoading, error, isPlaceholderData, isFetching } = useQuery({
    queryKey: ["registroDonacion", id],
    queryFn: () => getRegistroDonacionPorId(id)
  });

  return {
    registroDonacion: data,
    loadingRegistroDonacion: isLoading,
    fetchingRegistroDonacion: isFetching,
    errorRegistroDonacion: error,
    isPlaceholderData,
  };
};

export function useGetReporteDonacionesPorMes() {
  return useMutation({
    mutationFn: async ({ mes, anio }: { mes: number; anio: number }) => {
      const pdfBlob = await getReporteDonacionesPorMes(mes, anio);

      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Reporte-donaciones-${mes}-${anio}.pdf`;
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
}

export function useGetRegistroDonacionPorSolicitud(id: number) {
  const { data, isLoading, error, isPlaceholderData, isFetching } = useQuery({
    queryKey: ["registroDonacionSolicitud", id],
    queryFn: () => getRegistroDonacionPorSolicitud(id)
  });

  return {
    registroDonacionPorSolicitud: data,
    loadingRegistroDonacionPorSolicitud: isLoading,
    fetchingRegistroDonacionPorSolicitud: isFetching,
    errorRegistroDonacionPorSolicitud: error,
    isPlaceholderData,
  };
};

export function useFiltrarRegistrosDonaciones(params: FiltrarRegistrosParams) {
  const { data, isLoading, isFetching, isPlaceholderData } = useQuery({
    queryKey: ['registrosDonacion-filtrado', params],
    queryFn: () => getFiltrarRegistrosDonaciones(params),
    placeholderData: keepPreviousData,
  });

  return {
    registrosDonacion:          data?.data  ?? [],
    totalRegistrosDonacion:     data?.total ?? 0,
    loadingRegistrosDonacion:   isLoading,
    fetchingRegistrosDonacion:  isFetching,
    isPlaceholderData,
  };
}

//post

export function usePostCrearRegistroDonacion() {
  return useMutation({
    mutationFn: ({
      idUsuario,
      registro,
    }: {
      idUsuario: number;
      registro: CrearRegistroDonacion;
    }) => postCrearRegistroDonacion({ idUsuario, registro }),
  });
}

//patch

export function usePatchCambiarEstadoARecibido() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ idRegistro, idUsuario }: { idRegistro: number; idUsuario: number }) => 
      patchCambiarEstadoARecibido({ idRegistro, idUsuario }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["registroDonacion", variables.idRegistro] });
    },
  });
}

export function usePatchEditarRegistroDonacion() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: patchEditarRegistroDonacion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registroDonacionId"] });
    },
  });

  return mutation;
}
