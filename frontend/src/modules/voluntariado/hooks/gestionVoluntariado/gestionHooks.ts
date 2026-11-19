import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AgregarActividades } from "../../models/accionesExpediente";
import { createActividadVoluntariado, getReporteActividadesVoluntariado, patchEditarActividadVoluntario } from "../../services/activdadesVoluntariosServices";
import { getExpedienteVoluntarioPorId, getAllExpedientesVoluntarioPorCedula, getExpedienteActivoPorCedula, getPreviewExpedientesVoluntarioActivos, editarExpedienteVoluntario, deleteHorarioVoluntario, desactivarExpedienteVoluntario } from "../../services/expedientesVoluntarios";

// get

export function useGetExpedienteVoluntarioPorId(id: number) {
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["expedienteVoluntarioId"],
    queryFn: () => getExpedienteVoluntarioPorId(id),
  });

  return {
    expedienteVoluntario: data,
    loadingExpedienteVoluntario: isLoading,
    fetchingExpedienteVoluntario: isFetching,
    errorExpedienteVoluntario: error,
  };
}

export function useGetAllExpedientesVoluntarioPorCedula(
  cedula: number, page: number, limit: number, shouldFetch?: boolean
) {
  const { data, isLoading, error, isPlaceholderData, isFetching } = useQuery({
    queryKey: ["solicitudesVoluntario", cedula, page, limit],
    queryFn: () => getAllExpedientesVoluntarioPorCedula(cedula, page, limit),
    select: (resp) => ({
      solicitudesVoluntariado: resp.data,
      total: resp.total,
    }),
    enabled: shouldFetch,
  });

  return {
    expedientesVoluntario: data?.solicitudesVoluntariado ?? [],
    totalExpedientesVoluntario: data?.total ?? 0,
    loadingExpedientesVoluntario: isLoading,
    fetchingExpedientesVoluntario: isFetching,
    errorExpedientesVoluntario: error,
    isPlaceholderData,
  };
}

export const useGetExpedienteActivoPorCedula = (cedula: string, shouldFetch: boolean) => {
  const query = useQuery({
    queryKey: ["expedienteActivoPorCedula", cedula],
    queryFn: () => getExpedienteActivoPorCedula(cedula),
    enabled: shouldFetch,
  });

  return {
    expedienteActivoPorCedula: query.data,
    loadingExpedienteActivoPorCedula: query.isLoading,
    fetchingExpedienteActivoPorCedula: query.isFetching,
    errorExpedienteActivoPorCedula: query.error,
  };
};

export function useGetPreviewExpedientesVoluntarioActivos(
  page?: number,
  limit?: number
) {
  const { data, isLoading, error, isPlaceholderData, isFetching } = useQuery({
    queryKey: ["solicitudesVoluntario", page, limit],
    queryFn: () => getPreviewExpedientesVoluntarioActivos(page, limit),
    select: (resp) => ({
      expedientesVoluntarioActivo: resp.data,
      total: resp.total,
    }),
  });

  return {
    expedientesVoluntarioActivo: data?.expedientesVoluntarioActivo ?? [],
    totalExpedientesVoluntarioActivo: data?.total ?? 0,
    loadingExpedientesVoluntarioActivo: isLoading,
    fetchingExpedientesVoluntarioActivo: isFetching,
    errorExpedientesVoluntarioActivo: error,
    isPlaceholderData,
  };
}


export function useGetReporteActividadesVoluntario() {
   return useMutation({
    mutationFn: async (idExpediente: number) => {
      const pdfBlob = await getReporteActividadesVoluntariado(idExpediente);

      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `reporte-actividades-${idExpediente}-hogarSanBlas.pdf`;
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
}

// posts 

export const useCreateActividadVoluntariado = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      idExpediente,
      agregarActividades,
    }: {
      idExpediente: number;
      agregarActividades: AgregarActividades;
    }) => createActividadVoluntariado({ idExpediente, agregarActividades }),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["expedienteVoluntarioId"],
      });
    },
  });
};


// patch


export const useEditarVoluntariado = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: editarExpedienteVoluntario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expedienteVoluntarioId"] });
    },
  });

  return mutation;

};

export const useDesactivarExpedienteVoluntario = (id: number) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => desactivarExpedienteVoluntario(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expedienteVoluntarioId"] });
    },
  });

  return mutation;

};

export const useEditarActividadVoluntariado = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: patchEditarActividadVoluntario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expedienteVoluntarioId"] });
    },
  });

  return mutation;

};

// delete 

export const useDeleteHorarioVoluntario = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      idHorario,
    }: {
      idHorario: number;
    }) => deleteHorarioVoluntario({ idHorario }),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["expedienteVoluntarioId"],
      });
    },
  });
};
