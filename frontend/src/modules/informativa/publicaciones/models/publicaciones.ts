export interface Publicacion {
    id: number;
    fecha: string;
    Titulo: string;
    Descripcion: string;
    imagenUrl: string;
  }

export interface CreatePublicacion {
    fecha: string;
    Titulo: string;
    Descripcion: string;
    imagen: File;
}

export interface CreatePublicacionResponse {
  id: number;
  fecha: string;
  Titulo: string;
  Descripcion: string;
  imagenUrl: string;
  isActive: boolean;
}

export interface UpdatePublicacion {
  fecha?: string;
  Titulo?: string;
  Descripcion?: string;
  imagen?: File;
}

export interface PublicacionInactiva {
  id: number,
  fecha: string,
  Titulo: string
}