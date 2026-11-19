import { createFileRoute } from '@tanstack/react-router'
import { useGetProyectoById, usePatchHandleProyecto, useUpdateProyecto } from '@/modules/informativa/publicaciones/hooks/publicacionesHooks'
import CardPublicacion from '@/modules/informativa/publicaciones/components/CardPublicacion'
import WebLoader from '@/components/Loader'
import type { UpdatePublicacion } from '@/modules/informativa/publicaciones/models/publicaciones'
import { ensurePerms, makeCan } from '@/services/authHelpers';
import { redirect } from '@tanstack/react-router'
export const Route = createFileRoute(
  '/informativa/publicaciones/proyectos/$id',
)({
  component: RouteComponent,
  beforeLoad: async ({ context, location }) => {
    const perms = await ensurePerms(context.queryClient)
    const { canAny } = makeCan(perms)
    const ok = canAny([
      'Informativa.Proyectos:Ver',
    ])
    if (!ok) throw redirect({ to: '/403', search: { from: location.href } })
  },
})

function RouteComponent() {
  const { id } = Route.useParams()
  const { proyecto, loadingProyecto, errorProyecto } = useGetProyectoById(Number(id))
  const { updateProyectoAsync, updatingProyecto } = useUpdateProyecto()
  const { patchHandleProyectoAsync, patchingHandleProyecto } = usePatchHandleProyecto()

  const handleUpdate = async (id: number, proyecto: UpdatePublicacion) => {
    await updateProyectoAsync({ id, proyecto })
  }

  const handleArchive = async (id: number) => {
    try {
      await patchHandleProyectoAsync({ id })
    } catch (error) {
      console.error("Error archiving project:", error)
    }
  }

  if (!proyecto) {
    return <div>Proyecto no encontrado</div>
  }

  if (errorProyecto) {
    return <div>Error al cargar el proyecto</div>
  }

  if (loadingProyecto) {
    return <WebLoader/>
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 flex flex-col items-center gap-6">
      <CardPublicacion 
      publicacion={proyecto} 
      onArchive={handleArchive} 
      archiving={patchingHandleProyecto}
      link={'/informativa/publicaciones/proyectos'}
      tipo="proyecto"
      onUpdate={handleUpdate}
      updating={updatingProyecto}
      />
    </div>
  )
}
