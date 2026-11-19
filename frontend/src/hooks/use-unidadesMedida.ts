import type { UnidadMedida } from "@/models/sharedModels";
import { getTipoUnidadMedida, getUnidadesMedida, postAgregarUnidadMedida } from "@/services/unidadMedida";
import { useMutation, useQuery } from "@tanstack/react-query";

export function useGetTipoUnidadMedida() {
    const { data, isLoading, error, isPlaceholderData, isFetching } = useQuery({
        queryKey: ["tipoUnidadMedida"],
        queryFn: () => getTipoUnidadMedida(),
    });

    return {
        tipoUnidadMedida: data ?? [],
        loadingTipoUnidadMedida: isLoading,
        fetchingTipoUnidadMedida: isFetching,
        errorTipoUnidadMedida: error,
        isPlaceholderData,
    };
}

export function useGetUnidadesMedida(idTipoUnidadMedida: number) {
    return useQuery({
        queryKey: ["unidadesMedida", idTipoUnidadMedida],
        queryFn: () => getUnidadesMedida(idTipoUnidadMedida),
    });
}

//posts

export function usePostAgregarUnidadMedida() {
    return useMutation({
        mutationFn: ({ 
            unidadMedida,
            idTipoUnidadMedida 
        }: { 
            unidadMedida: UnidadMedida,
            idTipoUnidadMedida: number
        }) => 
            postAgregarUnidadMedida({ unidadMedida, idTipoUnidadMedida })
    });
}