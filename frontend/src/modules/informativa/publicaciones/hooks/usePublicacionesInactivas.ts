import {
  useGetProyectosInactivos,
  useGetDonacionesInactivas,
  useGetEventosInactivas,
} from './publicacionesHooks'

export type PublicacionType = 'donacion' | 'proyecto' | 'evento'

export function usePublicacionesInactivas(
  type: PublicacionType,
  page: number,
  limit: number
) {
  const proyectos = useGetProyectosInactivos(page, limit)
  const donaciones = useGetDonacionesInactivas(page, limit)
  const eventos = useGetEventosInactivas(page, limit)

  const map = {
    proyecto: {
      items: proyectos.proyectos,
      total: proyectos.total,
      loading: proyectos.loadingProyectos,
    },
    donacion: {
      items: donaciones.donaciones,
      total: donaciones.total,
      loading: donaciones.loadingDonaciones,
    },
    evento: {
      items: eventos.eventos,
      total: eventos.total,
      loading: eventos.loadingEventos,
    },
  }

  return map[type]
}