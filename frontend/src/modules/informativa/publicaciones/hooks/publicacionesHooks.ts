import type { CreatePublicacion, UpdatePublicacion } from "../models/publicaciones"
import { createDonacion, createEvento, createProyecto, getDonacionById, getDonaciones, getDonacionesInactivas, getEventoById, getEventos, getEventosInactivas, getProyectoById, getProyectos, getProyectosInactivas, patchEvento, patchHandleDonacion, patchHandleEvento, patchHandleProyecto, patchProyecto, updateDonacion } from "../services/publicacionesService"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

export function useGetProyectos( page?: number, limit?:number) {
    const { data, isLoading, error, isPlaceholderData, isFetching } = useQuery({
      queryKey: ['proyectos', page],
      queryFn: () => getProyectos(page, limit),
      select: (resp) => ({
        proyectos: resp.data,
        total: resp.total,
      }), 
    })
  
    return {
      proyectos: data?.proyectos ?? [],
      total: data?.total ?? 0,
      loadingProyectos: isLoading,
      fetchingProyectos: isFetching,
      errorProyectos: error,
      isPlaceholderData
    }
  }
  
  export function useGetDonaciones(page?: number, limit?:number) {
    const { data, isLoading, error, isPlaceholderData, isFetching } = useQuery({
      queryKey: ['donaciones', page],
      queryFn: () => getDonaciones(page, limit),
      select: (resp) => ({
        donaciones: resp.data,
        total: resp.total,
      }), 
    })
  
    return {
      donaciones: data?.donaciones ?? [],
      total: data?.total ?? 0,
      loadingDonaciones: isLoading,
      fetchingDonaciones: isFetching,
      errorDonaciones: error, 
      isPlaceholderData
    }
  }
  
  export function useGetEventos(page?:number, limit?:number) {
    const { data, isLoading, error, isPlaceholderData, isFetching } = useQuery({
      queryKey: ['eventos', page],
      queryFn: () => getEventos(page, limit),
     select: (resp) => ({
        eventos: resp.data,
        total: resp.total,
      }), 
    })
  
    return {
      eventos: data?.eventos ?? [],
      total: data?.total ?? 0,
      loadingEventos: isLoading,
      fetchingEventos: isFetching,
      errorEventos: error,
      isPlaceholderData
    }
  }
  
export function useGetDonacionById(id: number) {
    const { data, isLoading, error, isPlaceholderData, isFetching } = useQuery({
      queryKey: ['donacion', id],
      queryFn: () => getDonacionById(id),
    })
  
    return {
      donacion: data,
      loadingDonacion: isLoading,
      fetchingDonacion: isFetching,
      errorDonacion: error, 
      isPlaceholderData
    }
  }
  
export function useGetProyectoById(id: number) {
    const { data, isLoading, error, isPlaceholderData, isFetching } = useQuery({
      queryKey: ['proyecto', id],
      queryFn: () => getProyectoById(id),
    })
  
    return {
      proyecto: data,
      loadingProyecto: isLoading,
      fetchingProyecto: isFetching,
      errorProyecto: error, 
      isPlaceholderData
    }
  }
  
export function useGetEventoById(id: number) {
    const { data, isLoading, error, isPlaceholderData, isFetching } = useQuery({
      queryKey: ['evento', id],
      queryFn: () => getEventoById(id),
    })
  
    return {
      evento: data,
      loadingEvento: isLoading,
      fetchingEvento: isFetching,
      errorEvento: error, 
      isPlaceholderData
    }
  }

export function useGetProyectosInactivos( page?: number, limit?:number) {
    const { data, isLoading, error, isPlaceholderData, isFetching } = useQuery({
      queryKey: ['proyectosInactivos', page],
      queryFn: () => getProyectosInactivas(page, limit),
      select: (resp) => ({
        proyectos: resp.data,
        total: resp.total,
      }), 
    })
  
    return {
      proyectos: data?.proyectos ?? [],
      total: data?.total ?? 0,
      loadingProyectos: isLoading,
      fetchingProyectos: isFetching,
      errorProyectos: error,
      isPlaceholderData
    }
  }

export function useGetDonacionesInactivas(page?: number, limit?: number) {
    const { data, isLoading, error, isPlaceholderData, isFetching } = useQuery({
      queryKey: ['donacionesInactivas', page],
      queryFn: () => getDonacionesInactivas(page, limit),
      select: (resp) => ({
        donaciones: resp.data,
        total: resp.total,
      }), 
    })
  
    return {
      donaciones: data?.donaciones ?? [],
      total: data?.total ?? 0,
      loadingDonaciones: isLoading,
      fetchingDonaciones: isFetching,
      errorDonaciones: error,
      isPlaceholderData
    }
  }

export function useGetEventosInactivas(page?: number, limit?: number) {
    const { data, isLoading, error, isPlaceholderData, isFetching } = useQuery({
      queryKey: ['eventosInactivas', page],
      queryFn: () => getEventosInactivas(page, limit),
      select: (resp) => ({
        eventos: resp.data,
        total: resp.total,
      }), 
    })

    return {
      eventos: data?.eventos ?? [],
      total: data?.total ?? 0,
      loadingEventos: isLoading,
      fetchingEventos: isFetching,
      errorEventos: error,
      isPlaceholderData
    }
  }

//posts

export function useCreateDonacion() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (donacion: CreatePublicacion) => createDonacion(donacion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["donaciones"] })
    },
  })

  return {
    createDonacion: mutation.mutate,
    createDonacionAsync: mutation.mutateAsync,
    creatingDonacion: mutation.isPending,
    errorCreateDonacion: mutation.error,
    statusCreateDonacion: mutation.status,
  }
}

export function useCreateProyecto() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (proyecto: CreatePublicacion) => createProyecto(proyecto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyectos"] })
    },
  })

  return {
    createProyecto: mutation.mutate,
    createProyectoAsync: mutation.mutateAsync,
    creatingProyecto: mutation.isPending,
    errorCreateProyecto: mutation.error,
    statusCreateProyecto: mutation.status,
  }
}

export function useCreateEvento() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (evento: CreatePublicacion) => createEvento(evento),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos"] })
    },
  })

  return {
    createEvento: mutation.mutate,
    createEventoAsync: mutation.mutateAsync,
    creatingEvento: mutation.isPending,
    errorCreateEvento: mutation.error,
    statusCreateEvento: mutation.status,
  }
}

//patch

export function useUpdateDonacion() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ id, donacion }: { id: number; donacion: UpdatePublicacion }) => 
      updateDonacion(id, donacion),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["donaciones"] })
      queryClient.invalidateQueries({ queryKey: ["donacion", id] })
    },
  })

  return {
    updateDonacion: mutation.mutate,
    updateDonacionAsync: mutation.mutateAsync,
    updatingDonacion: mutation.isPending,
    errorUpdateDonacion: mutation.error,
    statusUpdateDonacion: mutation.status,
  }
}

export function useUpdateProyecto() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ id, proyecto }: { id: number; proyecto: UpdatePublicacion }) => 
      patchProyecto(id, proyecto),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["proyectos"] })
      queryClient.invalidateQueries({ queryKey: ["proyecto", id] })
    },
  })

  return {
    updateProyecto: mutation.mutate,
    updateProyectoAsync: mutation.mutateAsync,
    updatingProyecto: mutation.isPending,
    errorUpdateProyecto: mutation.error,
    statusUpdateProyecto: mutation.status,
  }
}

export function useUpdateEvento() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ id, evento }: { id: number; evento: UpdatePublicacion }) => 
      patchEvento(id, evento),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["eventos"] })
      queryClient.invalidateQueries({ queryKey: ["evento", id] })
    },
  })

  return {
    updateEvento: mutation.mutate,
    updateEventoAsync: mutation.mutateAsync,
    updatingEvento: mutation.isPending,
    errorUpdateEvento: mutation.error,
    statusUpdateEvento: mutation.status,
  }
}

export function usePatchHandleDonacion() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ id }: { id: number }) =>
      patchHandleDonacion.handleEstadoDonacion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["donaciones"] });
    },
  })

  return {
    patchHandleDonacion: mutation.mutate,
    patchHandleDonacionAsync: mutation.mutateAsync,
    patchingHandleDonacion: mutation.isPending,
    errorPatchHandleDonacion: mutation.error,
    statusPatchHandleDonacion: mutation.status,
  }
}

export function usePatchHandleProyecto() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ id }: { id: number }) =>
      patchHandleProyecto.handleEstadoProyecto(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyectos"] });
    },
  })

  return {
    patchHandleProyecto: mutation.mutate,
    patchHandleProyectoAsync: mutation.mutateAsync,
    patchingHandleProyecto: mutation.isPending,
    errorPatchHandleProyecto: mutation.error,
    statusPatchHandleProyecto: mutation.status,
  }
}

export function usePatchHandleEvento() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ id, fecha }: { id: number; fecha?: string }) =>
      patchHandleEvento.handleEstadoEvento(id, fecha),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos"] });
    },
  })

  return {
    patchHandleEvento: mutation.mutate,
    patchHandleEventoAsync: mutation.mutateAsync,
    patchingHandleEvento: mutation.isPending,
    errorPatchHandleEvento: mutation.error,
    statusPatchHandleEvento: mutation.status,
  }
}