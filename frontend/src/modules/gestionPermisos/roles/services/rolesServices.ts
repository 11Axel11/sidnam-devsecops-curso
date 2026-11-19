import sidnamAPI from "@/api/apiConfig";
import { rutaBaseGestionUsuarios } from "../../rutasRoles";
import type { Accion, CrearRol, PatchRolPayload, Permiso, Rol, RolPermisos, RolResponse } from "../models/roles";

export const getAllRoles = async (): Promise<Rol[]> => {
    const response = await sidnamAPI.get<Rol[]>(`${rutaBaseGestionUsuarios}/roles/all`);
    return response.data;
};

export const getRolesActivos = async (): Promise<Rol[]> => {
    const response = await sidnamAPI.get<Rol[]>(`${rutaBaseGestionUsuarios}/roles`);
    return response.data;
};

export const getPermisos = async (): Promise<Permiso[]> => {
    const response = await sidnamAPI.get<Permiso[]>(`${rutaBaseGestionUsuarios}/permisos`);
    return response.data;
};

export const getAcciones = async (): Promise<Accion[]> => {
    const response = await sidnamAPI.get<Accion[]>(`${rutaBaseGestionUsuarios}/acciones`);
    return response.data;
};

export const getPermisosDeRol = async (id: string): Promise<RolPermisos> => {
    const response = await sidnamAPI.get<RolPermisos>(`${rutaBaseGestionUsuarios}/acciones-por-rol/${id}`);
    return response.data;
};

// post 


export const createRol = async (
    { rol }: { rol: CrearRol }
): Promise<RolResponse> => {
    const response = await sidnamAPI.post<RolResponse>(
        `${rutaBaseGestionUsuarios}/roles`,
        rol
    );
    return response.data;
};

export const createPermisosRol = async (
    rolId: number,
    permisoId: number,
    accionId: number
): Promise<{ message: string }> => {
    const response = await sidnamAPI.post<{ message: string }>(
        `${rutaBaseGestionUsuarios}/permisos/acciones/rol/${rolId}/${permisoId}/${accionId}`
    );
    return response.data;
};


// patch
export const desactivarRol = async (
    rolId: number
): Promise<{ message: string }> => {
    const response = await sidnamAPI.patch<{ message: string }>(
        `${rutaBaseGestionUsuarios}/roles/estado/desactivar/${rolId}`
    );
    return response.data;
};

export const activarRol = async (
    rolId: number
): Promise<{ message: string }> => {
    const response = await sidnamAPI.patch<{ message: string }>(
        `${rutaBaseGestionUsuarios}/roles/estado/activar/${rolId}`
    );
    return response.data;
};


export async function patchRol({
    idRol,
    payload,
}: {
    idRol: number;
    payload: PatchRolPayload;
}) {
    const { data } = await sidnamAPI.patch(
        `/gestion-usuario/roles/${idRol}`,
        payload
    );
    return data;
}

// delete 


export const removePermisosRol = async (
    rolId: number,
    permisoId: number,
    accionId: number
): Promise<{ message: string }> => {
    const response = await sidnamAPI.delete<{ message: string }>(
        `${rutaBaseGestionUsuarios}/permisos/acciones/rol/${rolId}/${permisoId}/${accionId}`
    );
    return response.data;
};
