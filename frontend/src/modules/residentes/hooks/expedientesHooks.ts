/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createExpedienteResidente, editarExpedienteResidente, getEstadoCivil, getExpedienteResidentePorCedula, getExpedienteResidentePorId, getExpedienteResidentePorNombre, getLineaPobreza, getPreviewExpedientesResidentes, getResumenExpedienteResidente, getTiposDependencia, getTiposPension } from "../services/expedientesServices";
import type { CrearExpedienteResidente } from "../models/expedienteResidente";

export function useGetTiposPension() {
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["tipoPension"],
    queryFn: () => getTiposPension(),
  });

  return {
    tipoPension: data,
    loadingTipoPension: isLoading,
    fetchingTipoPension: isFetching,
    errorTipoPension: error,
  };
}

export function useGetTiposDependencia() {
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["tipoDependencia"],
    queryFn: () => getTiposDependencia(),
  });

  return {
    tiposDependencia: data,
    loadingTiposDependencia: isLoading,
    fetchingTiposDependencia: isFetching,
    errorTiposDependencia: error,
  };
}

export function useGetLineaPobreza() {
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["lineaPobreza"],
    queryFn: () => getLineaPobreza(),
  });

  return {
    lineaPobreza: data,
    loadingLineaPobreza: isLoading,
    fetchingLineaPobreza: isFetching,
    errorLineaPobreza: error,
  };
}

export function useGetEstadoCivil() {
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["estadoCivil"],
    queryFn: () => getEstadoCivil(),
  });

  return {
    estadoCivil: data,
    loadingEstadoCivil: isLoading,
    fetchingEstadoCivil: isFetching,
    errorEstadoCivil: error,
  };
}

export function useGetPreviewExpedientesResidente(
  estado: number,
  page?: number,
  limit?: number
) {
  const { data, isLoading, error, isPlaceholderData, isFetching } = useQuery({
    queryKey: ['expedientesResidentes', estado, page, limit],
    queryFn: async () => {
      try {
        const resp = await getPreviewExpedientesResidentes(estado, page, limit);
        return { expedientesResidentes: resp.data ?? [], total: resp.total ?? 0 };
      } catch (err: any) {
        const status = err?.response?.status ?? err?.status;
        if (status === 404) {
          return { expedientesResidentes: [], total: 0 };
        }
        throw err;
      }
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnReconnect: 'always',
    retry: (failureCount, err: any) => {
      const status = err?.response?.status ?? err?.status;
      if (status === 404) return false;
      return failureCount < 2;
    },
  });

  return {
    expedientesResidentes: data?.expedientesResidentes ?? [],
    totalExpedientesResidentes: data?.total ?? 0,
    loadingExpedientesResidentes: isLoading,
    fetchingExpedientesResidentes: isFetching,
    errorExpedientesResidentes: error,
    isPlaceholderData,
  };
}

export function useGetExpedienteResidente(
  id: number,
) {
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["expedienteResidenteId", id],
    queryFn: () => getExpedienteResidentePorId(id),
  });

  return {
    expedienteResidente: data,
    loadingExpedienteResidente: isLoading,
    fetchingExpedienteResidente: isFetching,
    errorExpedienteResidente: error,
  };
}

export function useGetResumenExpedienteResidente(
  id: number,
) {
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["expedienteResidenteResumenId", id],
    queryFn: () => getResumenExpedienteResidente(id),
  });

  return {
    expedienteResidente: data,
    loadingExpedienteResidente: isLoading,
    fetchingExpedienteResidente: isFetching,
    errorExpedienteResidente: error,
  };
}
export function useGetExpedienteResidentePorCedula(
  cedula: number,
  enabled: boolean = true 
) {
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["expedienteResidenteBusqueda", cedula],
    queryFn: () => getExpedienteResidentePorCedula(cedula),
    enabled: enabled && cedula > 0, 
  });

  return {
    expedienteResidenteCedula: data,
    loadingExpedienteResidenteCedula: isLoading,
    fetchingExpedienteResidenteCedula: isFetching,
    errorExpedienteResidenteCedula: error,
  };
}


export function useGetExpedientesResidentePorNombre(
  nombre: string,
  enabled: boolean = true
) {
  const cleanNombre = nombre.replace(/\s+/g, ""); 

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["expedienteResidenteBusqueda", cleanNombre],
    queryFn: () => getExpedienteResidentePorNombre(cleanNombre),
    enabled: enabled && cleanNombre.trim() !== '',
  });

  return {
    expedientesResidenteNombre: data || [],
    loadingExpedientesResidenteNombre: isLoading,
    fetchingExpedientesResidenteNombre: isFetching,
    errorExpedientesResidenteNombre: error,
  };
}

// posts 

export const useCreateExpedienteResidente = () => {
  return useMutation({
    mutationFn: ({
      expediente,
    }: {
        expediente: CrearExpedienteResidente;
      }) => createExpedienteResidente({ expediente }),
  });
};


// patch


export const useEditarExpedienteResidente = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: editarExpedienteResidente,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expedienteResidenteId"] });
    },
  });

  return mutation;

};