import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { activarRol, createPermisosRol, createRol, desactivarRol, getAcciones, getAllRoles, getPermisos, getPermisosDeRol, getRolesActivos, patchRol, removePermisosRol } from "../services/rolesServices"
import type { CrearRol, PatchRolPayload } from "../models/roles";

export function useGetAllRoles() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['roles'],
        queryFn: getAllRoles
    })

    return {
        Roles: data,
        loadingRoles: isLoading,
        errorRoles: error
    }
}
export function useGetRolesActivos() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['roles'],
        queryFn: getRolesActivos
    })

    return {
        Roles: data,
        loadingRoles: isLoading,
        errorRoles: error
    }
}

export function useGetAcciones() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['acciones'],
        queryFn: getAcciones
    })

    return {
        Acciones: data,
        loadingAcciones: isLoading,
        errorAcciones: error
    }
}

export function useGetPermisos() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['permisos'],
        queryFn: getPermisos
    })

    return {
        Permisos: data,
        loadingPermisos: isLoading,
        errorPermisos: error
    }
}

export function useGetPermisosDeRol(id:string) {
    const { data, isLoading, error } = useQuery({
        queryKey: ['rol', id],
        queryFn: () => getPermisosDeRol(id)
    })

    return {
        rol: data,
        loadingRol: isLoading,
        errorRol: error
    }
}


// post 


export const useCreateRol = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            rol,
        }: {
            rol: CrearRol;
        }) => createRol({ rol }),

        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["roles"],
            });
        },
    });
};

export const useCreatePermisosRol = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ rolId, permisoId, accionId }: { rolId: number; permisoId: number; accionId: number }) =>
            createPermisosRol(rolId, permisoId, accionId),
        onSuccess: (_, vars) => {
            qc.invalidateQueries({ queryKey: ["roles", vars.rolId] });
        },
    });
};


// patch

export const useDesactivarRol = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            rolId,
        }: {
            rolId: number;
            }) => desactivarRol(rolId),

        onSuccess: (rolId) => {
            queryClient.invalidateQueries({
                queryKey: ["rol", rolId],
            });
        },
    });
};

export const useActivarRol = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            rolId,
        }: {
            rolId: number;
        }) => activarRol(rolId),

        onSuccess: (rolId) => {
            queryClient.invalidateQueries({
                queryKey: ["rol", rolId],
            });
        },
    });
};


export const useEditarRol = () => {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({ idRol, payload }: { idRol: number; payload: PatchRolPayload }) =>
            patchRol({ idRol, payload }),
        onSuccess: (_data, variables) => {
            // refrescar el rol editado y el listado
            qc.invalidateQueries({ queryKey: ["rol", String(variables.idRol)] });
            qc.invalidateQueries({ queryKey: ["roles"] });
        },
    });
};

// delete 
export const useRemovePermisoRol = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rolId, permisoId, accionId }: { rolId: number; permisoId: number; accionId: number }) =>
      removePermisosRol(rolId, permisoId, accionId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["rol", String(vars.rolId)] });
      qc.invalidateQueries({ queryKey: ["roles"] });
    },
  });
};