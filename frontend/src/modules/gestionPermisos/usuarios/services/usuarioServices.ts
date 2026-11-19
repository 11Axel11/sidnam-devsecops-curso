import sidnamAPI from "@/api/apiConfig";
import type { CrearUsuario, EditarPerfil, Usuario, UsuarioDetalle, UsuarioPerfil } from "../models/user";
import { rutaBaseAutenticacion, rutaBaseGestionUsuarios, rutaBaseUsuarios } from "../../rutasRoles";

export const getUsuarios = async (estado: number, page?: number, limit?: number): Promise<{ data: Usuario[]; total: number }> => {
  const response = await sidnamAPI.get<{
      data: Usuario[];
    total: number;
  }>(`${rutaBaseUsuarios}/${estado}?page=${page}&limit=${limit}`);
  return response.data;
};

export const getUsuarioPorCedula = async (cedula: string): Promise<UsuarioDetalle> => {
  const response = await sidnamAPI.get<UsuarioDetalle>(`${rutaBaseUsuarios}/cedula/${cedula}`);
  return response.data;
};

export const getUsuarioPerfil = async (): Promise<UsuarioPerfil> => {
  const response = await sidnamAPI.get<UsuarioPerfil>(`${rutaBaseGestionUsuarios}/perfil`);
  return response.data;
};


// post 

export const createUsuario = async (
  usuario: CrearUsuario
): Promise<{ message: string }> => {
  const response = await sidnamAPI.post<{ message: string }>(
    `${rutaBaseAutenticacion}/register`, usuario
  );
  return response.data;
};

export const crearFotoPerfil = async ({
  file,
  usuarioId,
}: { file: File; usuarioId: number }) => {
  const fd = new FormData();
  fd.append("imagen", file);
  fd.append("usuarioId", String(usuarioId)); 

  const res = await sidnamAPI.post(
    `${rutaBaseGestionUsuarios}/createImagen`,
    fd,
    {
      headers: { "Content-Type": "multipart/form-data" }, 
      transformRequest: [(d) => d], 
    }
  );
  return res.data;
};

// patch
export const desactivarUsuario = async (
  idUsuario: number
): Promise<{ message: string }> => {
  const response = await sidnamAPI.patch<{ message: string }>(
    `${rutaBaseUsuarios}/desactivar/${idUsuario}`
  );
  return response.data;
};

export const activarUsuario = async (
  idUsuario: number
): Promise<{ message: string }> => {
  const response = await sidnamAPI.patch<{ message: string }>(
    `${rutaBaseUsuarios}/activar/${idUsuario}`
  );
  return response.data;
};

export const editarPerfil = async (
  idUsuario: number,
  payload: EditarPerfil
): Promise<{ message: string }> => {
  const response = await sidnamAPI.patch<{ message: string }>(
    `${rutaBaseUsuarios}/${idUsuario}`,
    payload
  );
  return response.data;
};