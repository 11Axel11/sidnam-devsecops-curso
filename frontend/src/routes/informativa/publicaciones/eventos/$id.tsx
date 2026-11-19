import { createFileRoute } from '@tanstack/react-router'
import { useGetEventoById, usePatchHandleEvento, useUpdateEvento } from '@/modules/informativa/publicaciones/hooks/publicacionesHooks'
import CardPublicacion from '@/modules/informativa/publicaciones/components/CardPublicacion'
import WebLoader from '@/components/Loader'
import type { UpdatePublicacion } from '@/modules/informativa/publicaciones/models/publicaciones'
import { ensurePerms, makeCan } from '@/services/authHelpers';
import { redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/informativa/publicaciones/eventos/$id')({
  component: RouteComponent,
  beforeLoad: async ({ context, location }) => {
    const perms = await ensurePerms(context.queryClient)
    const { canAny } = makeCan(perms)
    const ok = canAny([
      'Informativa.Eventos:Ver',
    ])
    if (!ok) throw redirect({ to: '/403', search: { from: location.href } })
  },
})

function RouteComponent() {
  const { id } = Route.useParams()
  const { evento, loadingEvento, errorEvento } = useGetEventoById(Number(id))
  const { updateEventoAsync, updatingEvento } = useUpdateEvento()
  const { patchHandleEventoAsync, patchingHandleEvento } = usePatchHandleEvento()

  const handleUpdate = async (id: number, evento: UpdatePublicacion) => {
    await updateEventoAsync({ id, evento })
  }

  const handleArchive = async (id: number) => {
    try {
      await patchHandleEventoAsync({ id })
    } catch (error) {
      console.error("Error archiving event:", error)
    }
  }

  if (!evento) {
    return <div>Evento no encontrado</div>
  }

  if (errorEvento) {
    return <div>Error al cargar el evento</div>
  }

  if (loadingEvento) {
    return <WebLoader />
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 flex flex-col items-center gap-6">
      <CardPublicacion
        publicacion={evento}
        onArchive={handleArchive}
        archiving={patchingHandleEvento}
        link={'/informativa/publicaciones/eventos'}
        tipo="evento"
        onUpdate={handleUpdate}
        updating={updatingEvento}
      />
    </div>
  )
}
