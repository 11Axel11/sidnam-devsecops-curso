import { createFileRoute } from '@tanstack/react-router'
import { usePatchHandleDonacion, useGetDonacionById, useUpdateDonacion } from '@/modules/informativa/publicaciones/hooks/publicacionesHooks'
import CardPublicacion from '@/modules/informativa/publicaciones/components/CardPublicacion'
import WebLoader from '@/components/Loader'
import type { UpdatePublicacion } from '@/modules/informativa/publicaciones/models/publicaciones'
import { ensurePerms, makeCan } from '@/services/authHelpers';
import { redirect } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/informativa/publicaciones/donaciones/$id',
)({
  component: RouteComponent,
    beforeLoad: async ({ context, location }) => {
      const perms = await ensurePerms(context.queryClient)
      const { canAny } = makeCan(perms)
      const ok = canAny([
        'Donaciones.Solicitud Donaciones:Ver',
      ])
      if (!ok) throw redirect({ to: '/403', search: { from: location.href } })
    },
})

function RouteComponent() {
  const { id } = Route.useParams()
  const { donacion, loadingDonacion, errorDonacion } = useGetDonacionById(Number(id))
  const { updateDonacionAsync, updatingDonacion } = useUpdateDonacion()
  const { patchHandleDonacionAsync, patchingHandleDonacion } = usePatchHandleDonacion()

  const handleUpdate = async (id: number, donacion: UpdatePublicacion) => {
    await updateDonacionAsync({ id, donacion })
  }

  const handleArchive = async (id: number) => {
    try {
      await patchHandleDonacionAsync({ id })
    } catch (error) {
      console.error("Error archiving donation:", error)
    }
  }

  if (!donacion) {
    return <div>Donacion no encontrada</div>
  }

  if (errorDonacion) {
    return <div>Error al cargar la donacion</div>
  }

  if (loadingDonacion) {
    return <WebLoader/>
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 flex flex-col items-center gap-6">
      <CardPublicacion 
      publicacion={donacion}
      onArchive={handleArchive}
      archiving={patchingHandleDonacion}
      link={'/informativa/publicaciones/donaciones'}
      tipo="solicitud de donación"
      onUpdate={handleUpdate}
      updating={updatingDonacion}/>
    </div>
  )
}
