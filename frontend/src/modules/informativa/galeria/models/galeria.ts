export interface Galeria {
  id: number;
  imagenUrl: string;
  categoriaId: number;
}

export interface Categoria {
  id: number;
  nombre: string;
  descripcion: string;
}

export interface GaleriaCategoria {
  id:number;
  imagenUrl: string;
    categoriaId: number;
  
}

export interface CreateImagenResponse {
  id: number;
  imagenUrl: string;
  categoriaId: number;
  isActive: boolean;
}

export interface CreateCategoria {
  id: number;
  nombre: string;
  descripcion: string;
  isActive: boolean;
}