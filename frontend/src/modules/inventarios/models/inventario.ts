export interface SubCategoria {
    id: number;
    nombre: string
}
    
export interface Categoria {
    id: number;
    nombre: string;
}

export interface Inventario {
    id: number;
    stock: number;
    codigo: string;
    nombre: string;
    imagen: string,
    subCategoriaId: number,
    unidadMedida: { id: number, nombre: string, abreviatura: string }
}

export interface InventarioAll {
    id: number;
    stock: number;
    codigo: string;
    nombre: string;
    unidadMedida: { nombre: string, abreviatura: string }
}

export interface ProductoInventarioArchivado {
    inventarioId: number;
    nombre: string;
    codigo: string;
    unidadMedida: { nombre: string, abreviatura: string }
}

export interface Producto {
    nombre: string;
    codigo: string;
    unidadMedida: number;
}

export interface EditarProductoInventario {
    nombre: string;
    codigo: string;
    unidadMedida: number;
    subcategoriaId?: number;
    imagen_url?: string;
}

export interface RegistroEntradaSalida {
    id: number;
    fecha: string;
    cantidad: number;
    codigo_producto: string;
    nombre: string;
    unidadMedida: { nombre: string, abreviatura: string };
}

export interface EntradaSalida {
    inventarioId: number;
    cantidad: number;
}

export interface EntradaMedicamento {
    medicamentoId: number;
    unidadMedidaId: number;
    cantidad: number;
}

export interface RegistroEntradaMedicamento {
    id: number;
    fecha: string;
    cantidad: number;
    nombreMedicamento: string;
    nombreUnidad: string;
    abreviaturaUnidad: string;
}

export interface InventarioProductoSalidas {
    inventarioId: number;
    stock: number;
    nombreProducto: string;
    nombreUnidadMedida: string;
    abreviaturaUnidadMedida: string;
    imagen: string;
}