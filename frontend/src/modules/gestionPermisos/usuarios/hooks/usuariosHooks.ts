import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { activarUsuario, crearFotoPerfil, createUsuario, desactivarUsuario, editarPerfil, getUsuarioPerfil, getUsuarioPorCedula, getUsuarios } from "../services/usuarioServices";
import type { CrearUsuario, EditarPerfil, UsuarioPerfil } from "../models/user";
import { toast } from "sonner";

export function useGetUsuarios(
  estado: number, page: number, limit: number, shouldFetch?: boolean
) {
  const { data, isLoading, error, isPlaceholderData, isFetching } = useQuery({
      queryKey: ["usuarios", estado, page, limit],
      queryFn: () => getUsuarios(estado, page, limit),
    select: (resp) => ({
      usuarios: resp.data,
      total: resp.total,
    }),
    enabled: shouldFetch,
  });

  return {
    Usuarios: data?.usuarios ?? [],
    totalUsuarios: data?.total ?? 0,
    loadingUsuarios: isLoading,
    fetchingUsuarios: isFetching,
    errorUsuarios: error,
    isPlaceholderData,
  };
}

export const useGetUsuarioPorCedula = (usuarioId: string) => {
  return useQuery({
    queryKey: ["usuario", usuarioId],
    queryFn: async () => getUsuarioPorCedula(usuarioId),
  });
};

export const useGetUsuarioPerfil = () => {
  const { data, isLoading, error, isPlaceholderData, isFetching } = useQuery({
    queryKey: ["usuarioPerfil",],
    queryFn: getUsuarioPerfil,
    staleTime: 5 * 60 * 1000,
  });

  return {
    UsuarioPerfil: data,
    loadingUsuarioPerfil: isLoading,
    fetchingUsuarioPerfil: isFetching,
    errorUsuarioPerfil: error,
    isPlaceholderData,
  };
};


// post


export const useCreateUsuario = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({  usuario }: { usuario: CrearUsuario }) =>
      createUsuario( usuario),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["usuarios"] });
    },
  });
};

export const useCreateFotoPerfil = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: crearFotoPerfil,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["usuarioPerfil"] });
    },
  });
};
// patch


export const useDesactivarUsuario = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            idUsuario,
        }: {
            idUsuario: number;
        }) => desactivarUsuario(idUsuario),

      onSuccess: (idUsuario) => {
            queryClient.invalidateQueries({
              queryKey: ["usuario", idUsuario],
            });
        },
    });
};

export const useActivarUsuario = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
          idUsuario,
        }: {
            idUsuario: number;
        }) => activarUsuario(idUsuario),

      onSuccess: (idUsuario) => {
            queryClient.invalidateQueries({
              queryKey: ["usuario", idUsuario],
            });
        },
    });
};

export const useEditarPerfil = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      idUsuario,
      payload,
    }: {
      idUsuario: number;
      payload: EditarPerfil;
    }) => editarPerfil(idUsuario, payload),

    onMutate: async ({ idUsuario, payload }) => {
      await queryClient.cancelQueries({ queryKey: ["usuarioPerfil"] });
      await queryClient.cancelQueries({ queryKey: ["usuario", idUsuario] });

      const prevPerfil = queryClient.getQueryData<UsuarioPerfil>(["usuarioPerfil"]);
      const prevUsuario = queryClient.getQueryData<UsuarioPerfil>(["usuario", idUsuario]);

      queryClient.setQueryData<UsuarioPerfil>(["usuarioPerfil"], (old) =>
        old ? ({ ...old, ...payload } as UsuarioPerfil) : old
      );
      queryClient.setQueryData<UsuarioPerfil>(["usuario", idUsuario], (old) =>
        old ? ({ ...old, ...payload } as UsuarioPerfil) : old
      );

      return { prevPerfil, prevUsuario, idUsuario };
    },

    onError: (_err, _vars, ctx) => {
      if (!ctx) return;
      if (ctx.prevPerfil) queryClient.setQueryData(["usuarioPerfil"], ctx.prevPerfil);
      if (ctx.prevUsuario) queryClient.setQueryData(["usuario", ctx.idUsuario], ctx.prevUsuario);
      toast.error("No se pudo actualizar el perfil. Intenta de nuevo.");
    },

    onSuccess: (data, vars) => {
      toast.success(data?.message ?? "Perfil actualizado correctamente.");
      queryClient.invalidateQueries({ queryKey: ["usuarioPerfil"] });
      queryClient.invalidateQueries({ queryKey: ["usuario", vars.idUsuario] });
    },
  });
};