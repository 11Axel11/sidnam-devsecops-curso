//endpoints a inventario

    //gets
    export const rutaGetCategorias = '/inventario/categorias';
    export const rutaGetSubCategorias = '/inventario/subcategorias';
    export const rutaGetProductos = '/inventario/productos';
    export const rutaGetInventario = '/inventario/categoria';
    export const rutaGetProductosArchivados = '/inventario/archivados';
    export const rutaGetEntradas = '/inventario/entradas';
    export const rutaGetSalidas = '/inventario/salidas';
    export const rutaReporteEntradasPorMes = '/inventario/reportes/entradas/pdf';
    export const rutaReporteSalidasPorMes = '/inventario/reportes/salidas/pdf';
    export const rutaGetInventarioAllProductos = '/inventario/AllProductos/subCategorias';
    export const rutaGetInventarioAllProductosSubCategorias = '/inventario/subcategoria';
    export const rutaGetMedicamentos = '/residentes/medicamentos';
    export const rutaGetEntradasMedicamentos = '/inventario/EntradaMedicamentos';
    export const rutaReporteEntradasMedicamentosPorMes = '/inventario/reportes/entrada-medicamentos/pdf';

    //posts
    export const rutaAgregarSubCategoria = 'inventario/subCategoria'
    export const rutaAgregarProducto = '/inventario/productos';
    export const rutaAgregarUnidadMedida = '/inventario/unidadesMedida';
    export const rutaAgregarEntrada = '/inventario/entrada';
    export const rutaAgregarSalida = '/inventario/salidas';
    export const rutaAgregarEntradaMedicamento = '/inventario/EntradaMedicamentos';

    //patch
    export const rutaEditarProductoInventario = '/inventario/update';
    export const rutaHandleArchivado = '/inventario/handleArchivado';
