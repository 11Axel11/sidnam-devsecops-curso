import { useQuery } from "@tanstack/react-query";
import { 
  getCategorias, 
  getInventario, 
  getProductosInventarioArchivados,
  getAllInventario,
  postAgregarProducto,
  patchEditarProductoInventario, 
  patchHandleArchivadoProductoInventario,
  getEntradas,
  getSalidas,
  getReporteEntradasPorMes,
  getReporteSalidasPorMes,
  postSalida,
  postEntrada,
  getSubCategorias,
  getInventarioAllProductos,
  getInventarioAllProductosSubCategorias,
  getMedicamentos,
  postEntradaMedicamento,
  getEntradasMedicamentos,
  getReporteEntradasMedicamentosPorMes,
  postAgregarSubCategoria
} from "../services/inventarioService";
import { useMutation } from "@tanstack/react-query";
import type { EntradaMedicamento, EntradaSalida, Producto } from "../models/inventario";
import { useQueryClient } from "@tanstack/react-query";

//gets

export function useGetCategorias() {
    const { data, isLoading, error, isPlaceholderData, isFetching } = useQuery({
        queryKey: ["categorias"],
        queryFn: () => getCategorias(),
    });

    return {
        categorias: data ?? [],
        loadingCategorias: isLoading,
        fetchingCategorias: isFetching,
        errorCategorias: error,
        isPlaceholderData,
    };
}

export function useGetSubCategorias() {
    const { data, isLoading, error, isPlaceholderData, isFetching } = useQuery({
        queryKey: ["subcategorias"],
        queryFn: () => getSubCategorias(),
    });

    return {
        subcategorias: data ?? [],
        loadingSubCategorias: isLoading,
        fetchingSubCategorias: isFetching,
        errorSubCategorias: error,
        isPlaceholderData,
    };
}

export function useGetInventario(
    categoryId: number,
    page?: number,
    limit?: number
) {
    const { data, isLoading, error, isPlaceholderData, isFetching } = useQuery({
        queryKey: ["inventario", categoryId, page, limit],
        queryFn: () => getInventario(categoryId, page, limit),
        select: (resp) => ({
            inventario: resp.data,
            total: resp.total,
        }),
    });

    return {
        inventario: data?.inventario ?? [],
        totalInventario: data?.total ?? 0,
        loadingInventario: isLoading,
        fetchingInventario: isFetching,
        errorInventario: error,
        isPlaceholderData,
    };
}

export function useGetAllInventario(
    categoryId: number,
) {
    const { data, isLoading, error, isPlaceholderData, isFetching } = useQuery({
        queryKey: ["allInventario", categoryId],
        queryFn: () => getAllInventario(categoryId),
        select: (resp) => ({
            inventario: resp.data,
            total: resp.total,
        }),
    });

    return {
        inventario: data?.inventario ?? [],
        totalInventario: data?.total ?? 0,
        loadingInventario: isLoading,
        fetchingInventario: isFetching,
        errorInventario: error,
        isPlaceholderData,
    };
}

export function useGetProductosInventarioArchivados(
    categoryId: number,
    page?: number,
    limit?: number
) {
    const { data, isLoading, error, isPlaceholderData, isFetching } = useQuery({
        queryKey: ["archivedProducts", categoryId, page, limit],
        queryFn: () => getProductosInventarioArchivados(categoryId, page, limit),
        select: (resp) => ({
            producto: resp.data,
            total: resp.total,
        }),
        enabled: !!categoryId,
    });

    return {
        producto: data?.producto ?? [],
        totalProducto: data?.total ?? 0,
        loadingProducto: isLoading,
        fetchingProducto: isFetching,
        errorProducto: error,
        isPlaceholderData,
    };
}

export function useGetEntradas(
    anio: number,
    mes: number,
    categoryId: number,
    page?: number,
    limit?: number,
) {
    const { data, isLoading, error, isPlaceholderData, isFetching } = useQuery({
        queryKey: ["entradas", anio, mes, categoryId, page, limit],
        queryFn: () => getEntradas(anio, mes, categoryId, page ?? 1, limit ?? 10),
        select: (resp) => ({
            entradas: resp.data,
            total: resp.total,
        }),
    });

    return {
        entradas: data?.entradas ?? [],
        totalEntradas: data?.total ?? 0,
        loadingEntradas: isLoading,
        fetchingEntradas: isFetching,
        errorEntradas: error,
        isPlaceholderData,
    };
}

export function useGetSalidas(
    anio: number,
    mes: number,
    categoryId: number,
    page?: number,
    limit?: number,
) {
    const { data, isLoading, error, isPlaceholderData, isFetching } = useQuery({
        queryKey: ["salidas", anio, mes, categoryId, page, limit],
        queryFn: () => getSalidas(anio, mes, categoryId, page ?? 1, limit ?? 10),
        select: (resp) => ({
            salidas: resp.data,
            total: resp.total,
        }),
    });

    return {
        salidas: data?.salidas ?? [],
        totalSalidas: data?.total ?? 0,
        loadingSalidas: isLoading,
        fetchingSalidas: isFetching,
        errorSalidas: error,
        isPlaceholderData,
    };
}

export function useGetReporteEntradasPorMes() {
    return useMutation({
        mutationFn: async ({ mes, anio, categoryId, categoryName }: { mes: number; anio: number; categoryId: number, categoryName: string }) => {
            const pdfBlob = await getReporteEntradasPorMes(mes, anio, categoryId);

            const url = window.URL.createObjectURL(pdfBlob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `Reporte_entradas_${categoryName}_${mes}_${anio}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);
        },
    });
}

export function useGetReporteSalidasPorMes() {
    return useMutation({
        mutationFn: async ({ anio, mes, categoryId, categoryName }: { anio: number; mes: number; categoryId: number, categoryName: string }) => {
            const pdfBlob = await getReporteSalidasPorMes(anio, mes, categoryId);

            const url = window.URL.createObjectURL(pdfBlob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `Reporte_salidas_${categoryName}_${mes}_${anio}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);
        },
    });
}

export function useGetInventarioAllProductos() {
    const { data, isLoading, error, isPlaceholderData, isFetching } = useQuery({
        queryKey: ["inventarioAllProductos"],
        queryFn: () => getInventarioAllProductos(),
        select: (resp) => ({
            inventarioAllProductos: resp.data,
            total: resp.total,
        }),
    });

    return {
        inventarioAllProductos: data?.inventarioAllProductos ?? [],
        totalInventarioAllProductos: data?.total ?? 0,
        loadingInventarioAllProductos: isLoading,
        fetchingInventarioAllProductos: isFetching,
        errorInventarioAllProductos: error,
        isPlaceholderData,
    };
}

export function useGetInventarioAllProductosSubCategorias(subcategoriaId: number) {
    const { data, isLoading, error, isPlaceholderData, isFetching, refetch } = useQuery({
        queryKey: ["inventarioAllProductosSubCategorias", subcategoriaId],
        queryFn: () => getInventarioAllProductosSubCategorias(subcategoriaId),
        select: (resp) => ({
            inventarioAllProductosSubCategorias: resp.data,
            total: resp.total,
        }),
    });

    return {
        inventarioAllProductosSubCategorias: data?.inventarioAllProductosSubCategorias ?? [],
        totalInventarioAllProductosSubCategorias: data?.total ?? 0,
        loadingInventarioAllProductosSubCategorias: isLoading,
        fetchingInventarioAllProductosSubCategorias: isFetching,
        errorInventarioAllProductosSubCategorias: error,
        isPlaceholderData,
        refetch
    };
}

export function useGetMedicamentos() {
    const { data, isLoading, error, isPlaceholderData, isFetching } = useQuery({
        queryKey: ["medicamentos"],
        queryFn: () => getMedicamentos(),
    });

    return {
        medicamentos: data ?? [],
        loadingMedicamentos: isLoading,
        fetchingMedicamentos: isFetching,
        errorMedicamentos: error,
        isPlaceholderData,
    };
}

export function useGetEntradasMedicamentos(
    anio: number,
    mes: number,
    page?: number, 
    limit?: number) {
    const { data, isLoading, error, isPlaceholderData, isFetching } = useQuery({
        queryKey: ["entradas", anio, mes, page, limit],
        queryFn: () => getEntradasMedicamentos(anio, mes, page ?? 1, limit ?? 10),
        select: (resp) => ({
            entradas: resp.data,
            total: resp.total,
        }),
    });

    return {
        entradasMedicamentos: data?.entradas ?? [],
        totalEntradasMedicamentos: data?.total ?? 0,
        loadingEntradasMedicamentos: isLoading,
        fetchingEntradasMedicamentos: isFetching,
        errorEntradasMedicamentos: error,
        isPlaceholderData,
    };
}

export function useGetReporteEntradasMedicamentosPorMes() {
    return useMutation({
        mutationFn: async ({ anio, mes }: { anio: number; mes: number }) => {
            const pdfBlob = await getReporteEntradasMedicamentosPorMes(anio, mes);
            
            const url = window.URL.createObjectURL(pdfBlob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `Reporte_Entradas_Medicamentos_${mes}_${anio}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);
        }
    });
}

//posts

export function usePostAgregarSubCategoria() {
    return useMutation({
        mutationFn: ({
            nombre
        } : {
            nombre: string
        }) =>
            postAgregarSubCategoria({ nombre })
    })
}

export function usePostAgregarProducto() {
    return useMutation({
        mutationFn: ({ 
            producto 
        }: { 
            producto: Producto 
        }) => 
            postAgregarProducto({ producto })
    });
}

export function usePostEntrada() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            productos
        }: {
            productos: EntradaSalida[]
        }) =>
            postEntrada({ productos }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventario'] });
            queryClient.invalidateQueries({ queryKey: ['movimientos', 'entradas'] });
        },
    });
}

export function usePostSalida() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            productos
        }: {
            productos: EntradaSalida[]
        }) =>
            postSalida({ productos }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventario'] });
            queryClient.invalidateQueries({ queryKey: ['movimientos', 'salidas'] });
        },
    });
}

export function usePostEntradaMedicamento() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ 
            items 
        }: { 
            items: EntradaMedicamento[] 
        }) => 
            postEntradaMedicamento({ items }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['entradasMedicamentos'] });
        },
    });
}

//patch

export function usePatchEditarProductoInventario() {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: patchEditarProductoInventario,
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["inventario"] });
        },
      });

      return mutation;
}

export function usePatchHandleArchivadoProductoInventario() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: patchHandleArchivadoProductoInventario,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["inventario"] });
            queryClient.invalidateQueries({ queryKey: ["archivados"] });
        },
    });
}