import type { Publicacion, CreatePublicacion, CreatePublicacionResponse, UpdatePublicacion, PublicacionInactiva } from "../models/publicaciones";
import sidnamAPI from "@/api/apiConfig";
import { rutaGetDonaciones, rutaGetProyectos, rutaGetEventos, rutaGetDonacionById, rutaGetProyectoById, rutaGetEventoById, rutaPostDonacion, rutaPostProyecto, rutaPostEvento, rutaPatchDonacion, rutaPatchProyecto, rutaPatchEvento, rutaPatchHandleDonacion, rutaPatchHandleEvento, rutaPatchHandleProyecto, rutaGetDonacionesArchivadas, rutaGetProyectosArchivados, rutaGetEventosArchivados } from "./rutas";

//gets

export const getDonaciones = async (page?: number, limit?: number)
: Promise<{ data: Publicacion[]; total: number }> => {
  const response = await sidnamAPI.get<{ data: Publicacion[]; total: number }>(
    `${rutaGetDonaciones}?page=${page}&limit=${limit}`
  );
  return response.data;
};

export const getProyectos = async (page?: number, limit?:number)
: Promise<{ data: Publicacion[]; total: number }> => {
  const response = await sidnamAPI.get<{ data: Publicacion[]; total: number }>(`${rutaGetProyectos}?page=${page}&limit=${limit}`);
  return response.data;
};

export const getEventos = async (page?: number, limit?:number)
: Promise<{ data: Publicacion[]; total: number }> => {
  const response = await sidnamAPI.get<{ data: Publicacion[]; total: number }>(`${rutaGetEventos}?page=${page}&limit=${limit}`);
  return response.data;
};

export const getDonacionById = async (id: number): Promise<Publicacion> => {
  const response = await sidnamAPI.get<Publicacion>(`${rutaGetDonacionById}/${id}`);
  return response.data;
};

export const getProyectoById = async (id: number): Promise<Publicacion> => {
  const response = await sidnamAPI.get<Publicacion>(`${rutaGetProyectoById}/${id}`);
  return response.data;
};

export const getEventoById = async (id: number): Promise<Publicacion> => {
  const response = await sidnamAPI.get<Publicacion>(`${rutaGetEventoById}/${id}`);
  return response.data;
};

export const getDonacionesInactivas = async (page?: number, limit?: number)
: Promise<{ data: PublicacionInactiva[]; total: number }> => {
  const response = await sidnamAPI.get<{ data: PublicacionInactiva[]; total: number }>(
    `${rutaGetDonacionesArchivadas}?page=${page}&limit=${limit}`
  );
  return response.data;
};

export const getProyectosInactivas = async (page?: number, limit?: number)
: Promise<{ data: PublicacionInactiva[]; total: number }> => {
  const response = await sidnamAPI.get<{ data: PublicacionInactiva[]; total: number }>(
    `${rutaGetProyectosArchivados}?page=${page}&limit=${limit}`
  );
  return response.data;
};

export const getEventosInactivas = async (page?: number, limit?: number)
: Promise<{ data: PublicacionInactiva[]; total: number }> => {
  const response = await sidnamAPI.get<{ data: PublicacionInactiva[]; total: number }>(
    `${rutaGetEventosArchivados}?page=${page}&limit=${limit}`
  );
  return response.data;
}

//posts

export const createDonacion = async (donacion: CreatePublicacion): Promise<CreatePublicacionResponse> => {
  const formData = new FormData()
  formData.append("fecha", donacion.fecha)
  formData.append("Titulo", donacion.Titulo)
  formData.append("Descripcion", donacion.Descripcion)
  formData.append("imagen", donacion.imagen)

  const response = await sidnamAPI.post<CreatePublicacionResponse>(rutaPostDonacion, 
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
};

export const createProyecto = async (proyecto: CreatePublicacion): Promise<CreatePublicacionResponse> => {
  const formData = new FormData()
  formData.append("fecha", proyecto.fecha)
  formData.append("Titulo", proyecto.Titulo)
  formData.append("Descripcion", proyecto.Descripcion)
  formData.append("imagen", proyecto.imagen)

  const response = await sidnamAPI.post<CreatePublicacionResponse>(rutaPostProyecto, 
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
};

export const createEvento = async (evento: CreatePublicacion): Promise<CreatePublicacionResponse> => {
  const formData = new FormData()
  formData.append("fecha", evento.fecha)
  formData.append("Titulo", evento.Titulo)
  formData.append("Descripcion", evento.Descripcion)
  formData.append("imagen", evento.imagen)

  const response = await sidnamAPI.post<CreatePublicacionResponse>(rutaPostEvento, 
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
};

//patch

export const updateDonacion = async (id: number, donacion: UpdatePublicacion): Promise<CreatePublicacionResponse> => {
  const formData = new FormData()
  
  // Only append fields that were actually changed
  if (donacion.fecha !== undefined) {
    formData.append("fecha", donacion.fecha)
  }
  
  if (donacion.Titulo !== undefined) {
    formData.append("Titulo", donacion.Titulo)
  }
  
  if (donacion.Descripcion !== undefined) {
    formData.append("Descripcion", donacion.Descripcion)
  }
  
  if (donacion.imagen !== undefined) {
    formData.append("imagen", donacion.imagen)
  }

  const response = await sidnamAPI.patch<CreatePublicacionResponse>(
    `${rutaPatchDonacion}/${id}`,  
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
};

export const patchProyecto = async (id: number, proyecto: UpdatePublicacion): Promise<CreatePublicacionResponse> => {
  const formData = new FormData()
  
  // Only append fields that were actually changed
  if (proyecto.fecha !== undefined) {
    formData.append("fecha", proyecto.fecha)
  }
  
  if (proyecto.Titulo !== undefined) {
    formData.append("Titulo", proyecto.Titulo)
  }
  
  if (proyecto.Descripcion !== undefined) {
    formData.append("Descripcion", proyecto.Descripcion)
  }
  
  if (proyecto.imagen !== undefined) {
    formData.append("imagen", proyecto.imagen)
  }

  const response = await sidnamAPI.patch<CreatePublicacionResponse>(
    `${rutaPatchProyecto}/${id}`,  
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
};

export const patchEvento = async (id: number, evento: UpdatePublicacion): Promise<CreatePublicacionResponse> => {
  const formData = new FormData()
  
  // Only append fields that were actually changed
  if (evento.fecha !== undefined) {
    formData.append("fecha", evento.fecha)
  }
  
  if (evento.Titulo !== undefined) {
    formData.append("Titulo", evento.Titulo)
  }
  
  if (evento.Descripcion !== undefined) {
    formData.append("Descripcion", evento.Descripcion)
  }
  
  if (evento.imagen !== undefined) {
    formData.append("imagen", evento.imagen)
  }

  const response = await sidnamAPI.patch<CreatePublicacionResponse>(
    `${rutaPatchEvento}/${id}`,  
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
};

export const patchHandleDonacion = {
  async handleEstadoDonacion(id: number): Promise<void> {
    await sidnamAPI.patch(`${rutaPatchHandleDonacion}/${id}`);
  },
};

export const patchHandleProyecto = {
  async handleEstadoProyecto(id: number): Promise<void> {
    await sidnamAPI.patch(`${rutaPatchHandleProyecto}/${id}`);
  }
};

export const patchHandleEvento = {
  async handleEstadoEvento(id: number, fecha?: string): Promise<void> {
    await sidnamAPI.patch(`${rutaPatchHandleEvento}/${id}`, fecha ? { fecha } : {});
  }
};