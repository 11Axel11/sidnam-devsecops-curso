import { useQuery } from "@tanstack/react-query";
import { getTiposVoluntario } from "../services/voluntariadoServices";
import { useMutation } from "@tanstack/react-query";
import { postAgregarTipoVoluntariado } from "../services/voluntariadoServices";

export function usePostAgregarTipoVoluntariado() {
    return useMutation({
      mutationFn: (nombre: string) => postAgregarTipoVoluntariado(nombre),
    });
  }

export function useGetTiposVoluntariado() {
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["tipoVoluntario"],
    queryFn: () => getTiposVoluntario(),
  });

  return {
    tipoVoluntario: data,
    loadingtipoVoluntario: isLoading,
    fetchingtipoVoluntario: isFetching,
    errortipoVoluntario: error,
  };
}
