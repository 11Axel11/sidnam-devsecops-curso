import sidnamAPI from "@/api/apiConfig";
import { rutaCreateCategoria, rutaCreateImagen, rutaDeleteImagen, rutaGetCategoriasActivas, rutaGetCategoriasInactivas, rutaGetImagenesByCategoria, rutaGetImagenesGaleria, rutaPatchHandleInactiva, rutaPatchUpdateCategoria, rutaPatchUpdateImagen } from "./rutas";
import type { Categoria, CreateCategoria, CreateImagenResponse, Galeria, GaleriaCategoria } from "../models/galeria";

//gets

export const getCategoriasActivas = async (): Promise<Categoria[]> => {
  const response = await sidnamAPI.get<Categoria[]>(`${rutaGetCategoriasActivas}`);
  return response.data;
};

export const getCategoriasInactivas = async (): Promise<Categoria[]> => {
  const response = await sidnamAPI.get<Categoria[]>(`${rutaGetCategoriasInactivas}`);
  return response.data;
};

export const getTodasGaleria = async (page: number, limit: number)
: Promise<Galeria[]> => {
  const response = await sidnamAPI.get<Galeria[]>(
    `${rutaGetImagenesGaleria}?page=${page}&limit=${limit}`
  );
  return response.data;
};

export const getImagenesPorCategoria = async (id:number, page: number, limit: number)
: Promise<GaleriaCategoria[]> => {
  const response = await sidnamAPI.get<GaleriaCategoria[]>(`${rutaGetImagenesByCategoria}/${id}?page=${page}&limit=${limit}`);
  return response.data;
}

//posts

export const postImagen = {
  async createImagen(file: File, categoriaId: number): Promise<CreateImagenResponse> {
    const formData = new FormData();
    formData.append("imagen", file); 
    formData.append("categoriaId", categoriaId.toString());

    const { data } = await sidnamAPI.post<CreateImagenResponse>(`${rutaCreateImagen}`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );

    return data;
  },
};

export const postCategoria = {
  async createCategoria(nombre: string, descripcion: string): Promise<CreateCategoria> {
    const { data } = await sidnamAPI.post<CreateCategoria>(`${rutaCreateCategoria}`, {
      nombre,
      descripcion,
    });
    return data;
  },
};

//patch
export const patchHandleInactiva = {
  async handleInactiva(id: number): Promise<void> {
    await sidnamAPI.patch(`${rutaPatchHandleInactiva}/${id}`);
  },
};

export const patchUpdateImagen = {
  async updateImagen(id: number, categoriaId: number): Promise<void> {
    await sidnamAPI.patch(`${rutaPatchUpdateImagen}/${id}`, {
      categoriaId,
    });
  },
};

export const patchUpdateCategoria = {
  async updateCategoria(id: number, nombre: string, descripcion: string): Promise<void> {
    await sidnamAPI.patch(`${rutaPatchUpdateCategoria}/${id}`, {
      nombre,
      descripcion,
    });
  },
};

//delete
export const deleteImagen = {
  async removeImagen(id: number): Promise<void> {
    await sidnamAPI.delete(`${rutaDeleteImagen}/${id}`);
  },
};
