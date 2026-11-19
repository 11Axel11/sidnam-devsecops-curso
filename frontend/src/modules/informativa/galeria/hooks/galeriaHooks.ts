import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteImagen, getCategoriasActivas, getCategoriasInactivas, getImagenesPorCategoria, getTodasGaleria, patchHandleInactiva, patchUpdateCategoria, patchUpdateImagen, postCategoria, postImagen } from "../services/galeriaService";

//gets

export function useGetCategorias() {
  const { data: Categorias, isLoading, error } = useQuery({
    queryKey: ['categorias'],
    queryFn: getCategoriasActivas
  })

  return {
    Categorias: Categorias ?? [],
    loadingCategorias: isLoading,
    errorCategorias: error
  }
}

export function useGetCategoriasInactivas() {
  const { data: CategoriasInactivas, isLoading, error } = useQuery({
    queryKey: ["categorias", "categoriasInactivas"],
    queryFn: getCategoriasInactivas
  })

  return {
    CategoriasInactivas,
    loadingCategoriasInactivas: isLoading,
    errorCategoriasInactivas: error
  }
}

export function useGetTodasGaleria(page: number, limit:number) {
  const {
    data: imagenes, isLoading: loadingImagenes, isFetching, isPlaceholderData, error: errorImagenes } = useQuery({
    queryKey: ['imagenes', page, limit],
    queryFn: () => getTodasGaleria(page, limit),
    placeholderData: keepPreviousData, 
  });

  return { imagenes, loadingImagenes, isFetching, isPlaceholderData, errorImagenes };
}

export const useGetImagenesPorCategoria = (idCategoria: number, page: number, limit:number) => {
  const { data, isPending, error, isPlaceholderData } = useQuery({
    queryKey: ['imagenesPorCategoria', idCategoria, page, limit],
    queryFn: () => getImagenesPorCategoria(idCategoria, page, limit), 
    enabled: !!idCategoria,
    placeholderData: keepPreviousData, 
  });

  return {
    imagenesPorCategoria: data,
    isPendingimagenesPorCategoria: isPending,
    errorimagenesPorCategoria: error,
    isPlaceholderData
  };
};

//posts

export const useCreateImagen = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, categoriaId }: { file: File; categoriaId: number }) =>
      postImagen.createImagen(file, categoriaId),

    onSuccess: (_data, variables) => {
      // Invalidate "todas"
      queryClient.invalidateQueries({ queryKey: ["imagenes"] });
      // Invalidate category-specific
      queryClient.invalidateQueries({ queryKey: ["imagenesPorCategoria", variables.categoriaId] });
    },
  });
};

export const useCreateCategoria = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ nombre, descripcion }: { nombre: string; descripcion: string }) =>
      postCategoria.createCategoria(nombre, descripcion),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias"] }); 
    },
  });
};

//patch

export const usePatchHandleInactiva = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: number }) =>
      patchHandleInactiva.handleInactiva(id),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias"] }); 
    },
  });
};

export const usePatchUpdateImagen = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, categoriaId }: { id: number; categoriaId: number }) =>
      patchUpdateImagen.updateImagen(id, categoriaId),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["imagenes"] }); 
      queryClient.invalidateQueries({ queryKey: ["imagenesPorCategoria"] });
    },
  });
};

export const usePatchUpdateCategoria = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, nombre, descripcion }: { id: number; nombre: string; descripcion: string }) =>
      patchUpdateCategoria.updateCategoria(id, nombre, descripcion),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias"] }); 
    },
  });
};
  
//delete

export const useDeleteImagen = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: number }) =>
      deleteImagen.removeImagen(id),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["imagenes"] }); 
      queryClient.invalidateQueries({ queryKey: ["imagenesPorCategoria"] });
    },
  });
};
