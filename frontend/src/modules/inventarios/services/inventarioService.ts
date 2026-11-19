import sidnamAPI from "@/api/apiConfig";
import { 
  rutaGetCategorias,
  rutaAgregarProducto, 
  rutaGetProductosArchivados,
  rutaGetEntradas,
  rutaGetSalidas,
  rutaGetInventario,
  rutaHandleArchivado,
  rutaEditarProductoInventario,
  rutaReporteEntradasPorMes,
  rutaReporteSalidasPorMes,
  rutaAgregarEntrada,
  rutaAgregarSalida,
  rutaGetSubCategorias,
  rutaGetInventarioAllProductos,
  rutaGetInventarioAllProductosSubCategorias,
  rutaGetMedicamentos,
  rutaAgregarEntradaMedicamento,
  rutaGetEntradasMedicamentos,
  rutaReporteEntradasMedicamentosPorMes,
  rutaAgregarSubCategoria,
} from "./rutas";
import type { 
    Categoria, 
    Producto, 
    Inventario, 
    EditarProductoInventario, 
    RegistroEntradaSalida, 
    ProductoInventarioArchivado,
    EntradaSalida, 
    InventarioAll,
    InventarioProductoSalidas,
    EntradaMedicamento,
    RegistroEntradaMedicamento,
    SubCategoria,
    } from "@/modules/inventarios/models/inventario";
import type { Medicamento } from "@/modules/residentes/models/enfermeria";

//get

export const getCategorias = async (): Promise<Categoria[]> => {
    const response = await sidnamAPI.get<Categoria[]>(`${rutaGetCategorias}`);
    return response.data;
};

export const getSubCategorias = async (): Promise<Categoria[]> => {
    const response = await sidnamAPI.get<Categoria[]>(`${rutaGetSubCategorias}`);
    return response.data;
};

export const getInventario = async (categoryId: number, page?: number, limit?: number): Promise<{ data: Inventario[]; total: number }> => {
    const response = await sidnamAPI.get<{
        data: Inventario[];
        total: number;
    }>(`${rutaGetInventario}/${categoryId}?page=${page}&limit=${limit}`);
    return response.data;
};

export const getAllInventario = async (categoryId: number): Promise<{ data: InventarioAll[]; total: number }> => {
    const response = await sidnamAPI.get<InventarioAll[]>(`${rutaGetInventario}/${categoryId}/all`);
    return {
        data: response.data,
        total: Array.isArray(response.data) ? response.data.length : 0
    };
};

export const getProductosInventarioArchivados = async (categoryId: number, page?: number, limit?: number): Promise<{ data: ProductoInventarioArchivado[]; total: number }> => {
    const response = await sidnamAPI.get<{
        data: ProductoInventarioArchivado[];
        total: number;
    }>(`${rutaGetProductosArchivados}/${categoryId}?page=${page}&limit=${limit}`);
    return response.data;
};

export const getEntradas = async (
    anio: number,
    mes: number,
    categoryId: number,
    page?: number,
    limit?: number,
): Promise<{ data: RegistroEntradaSalida[]; total: number }> => {
    const response = await sidnamAPI.get<{
        data: RegistroEntradaSalida[];
        total: number;
    }>(`${rutaGetEntradas}/${anio}/${mes}/${categoryId}?page=${page}&limit=${limit}`);
    return response.data;
};

export const getSalidas = async (
    anio: number,
    mes: number,
    categoryId: number,
    page?: number,
    limit?: number,
): Promise<{ data: RegistroEntradaSalida[]; total: number }> => {
    const response = await sidnamAPI.get<{
        data: RegistroEntradaSalida[];
        total: number;
    }>(`${rutaGetSalidas}/${anio}/${mes}/${categoryId}?page=${page}&limit=${limit}`);
    return response.data;
};

export const getReporteEntradasPorMes = async (mes: number, anio: number, categoryId: number): Promise<Blob> => {
    const response = await sidnamAPI.get(`${rutaReporteEntradasPorMes}`, {
        params: {
            categoriaId: categoryId,
            mes: mes,
            anio: anio
        },
        responseType: 'blob',
    });
    return response.data;
};

export const getReporteSalidasPorMes = async (anio: number, mes: number, categoryId: number): Promise<Blob> => {
    const response = await sidnamAPI.get(`${rutaReporteSalidasPorMes}`, {
        params: {
            anio: anio,
            mes: mes,
            categoriaId: categoryId
        },
        responseType: 'blob',
    });
    return response.data;
};

export const getInventarioAllProductos = async (): Promise<{data: InventarioProductoSalidas[]; total: number}> => {
    const response = await sidnamAPI.get<{data: InventarioProductoSalidas[]; total: number}>(`${rutaGetInventarioAllProductos}`);
    return response.data;
}

export const getInventarioAllProductosSubCategorias = async (subcategoriaId: number): Promise<{data: InventarioProductoSalidas[]; total: number}> => {
    const response = await sidnamAPI.get<{data: InventarioProductoSalidas[]; total: number}>(`${rutaGetInventarioAllProductosSubCategorias}/${subcategoriaId}`);
    return response.data;
}

export const getMedicamentos = async (): Promise<{data: Medicamento[]; total: number}> => {
    const response = await sidnamAPI.get<{data: Medicamento[]; total: number}>(`${rutaGetMedicamentos}`);
    return response.data;
}

export const getEntradasMedicamentos = async (
    anio: number,
    mes: number,
    page?: number, 
    limit?: number
): Promise<{data: RegistroEntradaMedicamento[]; total: number}> => {
    const response = await sidnamAPI.get<{
        data: RegistroEntradaMedicamento[]; 
        total: number
    }>(`${rutaGetEntradasMedicamentos}?anio=${anio}&mes=${mes}&page=${page}&limit=${limit}`);
    return response.data;
}

export const getReporteEntradasMedicamentosPorMes = async (anio: number, mes: number): Promise<Blob> => {
    const response = await sidnamAPI.get(`${rutaReporteEntradasMedicamentosPorMes}`, {
        params: {
            anio: anio,
            mes: mes,
        },
        responseType: 'blob',
    });
    return response.data;
}

//post

export const postAgregarSubCategoria = async (
    {nombre}: {nombre: string}
): Promise<SubCategoria> => {
    const response = await sidnamAPI.post<SubCategoria>(
        `${rutaAgregarSubCategoria}`,
        {nombre}
    );
    return response.data;
}

export const postAgregarProducto = async (
    { producto }: { producto: Producto }
): Promise<Producto> => {
    const response = await sidnamAPI.post<Producto>(
        `${rutaAgregarProducto}`,
        producto
    );
    return response.data;
};

export const postEntrada = async (
    { productos }: { productos: EntradaSalida[] }
): Promise<EntradaSalida> => {
    const response = await sidnamAPI.post<EntradaSalida>(
        `${rutaAgregarEntrada}`,
        { productos, fechaRegistro: new Date().toISOString() }
    );
    return response.data;
};

export const postSalida = async (
    { productos }: { productos: EntradaSalida[] }
): Promise<EntradaSalida> => {
    const response = await sidnamAPI.post<EntradaSalida>(
        `${rutaAgregarSalida}`,
        { productos, fechaRegistro: new Date().toISOString() }
    );
    return response.data;
};

export const postEntradaMedicamento = async (
    { items }: { items: EntradaMedicamento[] }
): Promise<EntradaMedicamento> => {
    const response = await sidnamAPI.post<EntradaMedicamento>(
        `${rutaAgregarEntradaMedicamento}`,
        { items }
    );
    return response.data;
};

//patch

export const patchEditarProductoInventario = async (
    { idInventario, producto }: { idInventario: number; producto: EditarProductoInventario }
): Promise<EditarProductoInventario> => {
    const response = await sidnamAPI.patch<EditarProductoInventario>(
        `${rutaEditarProductoInventario}/${idInventario}`,
        producto
    );
    return response.data;
};

export const patchHandleArchivadoProductoInventario = async (
    { idInventario }: { idInventario: number }
): Promise<{ message: string }> => {
    const response = await sidnamAPI.patch<{ message: string }>(
        `${rutaHandleArchivado}/${idInventario}`
    );
    return response.data;
};