import type { UnidadMedida, TipoUnidadMedida, UnidadMedidaId } from "@/models/sharedModels";
import sidnamAPI from "@/api/apiConfig";

//gets

export const getTipoUnidadMedida = async (): Promise<TipoUnidadMedida[]> => {
    const response = await sidnamAPI.get<TipoUnidadMedida[]>(`/unidades-medida`);
    return response.data;
};

export const getUnidadesMedida = async (idTipoUnidadMedida: number): Promise<UnidadMedidaId[]> => {
    const response = await sidnamAPI.get<UnidadMedidaId[]>(`/unidades-medida/unidades/${idTipoUnidadMedida}`);
    return response.data;
};

//posts

export const postAgregarUnidadMedida = async (
    { unidadMedida, idTipoUnidadMedida }: { unidadMedida: UnidadMedida, idTipoUnidadMedida: number }
): Promise<UnidadMedida> => {
    const response = await sidnamAPI.post<UnidadMedida>(
        `/unidades-medida/tipo-unidad-medida/unidad-medida/${idTipoUnidadMedida}`,
        unidadMedida,
        { params: { idTipoUnidadMedida } }
    );
    return response.data;
}