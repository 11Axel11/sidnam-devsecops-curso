import { createFileRoute, redirect } from '@tanstack/react-router'
import z from 'zod'
import { useParams } from '@tanstack/react-router'
import WebLoader from '@/components/Loader'
import CardDonacion from '@/modules/donaciones/components/CardDonacion'
import { useGetSolicitudesDonacionPorId } from '@/modules/donaciones/hooks/solicitudesDonacion/solicitudesDonacionHook'
import { ensurePerms, makeCan } from '@/services/authHelpers'

export const Route = createFileRoute('/donaciones/solicitudes/$id')({
  component: RouteComponent,
  parseParams: (params) => ({
    id: z.coerce.number().int().positive().parse(params.id),
  }),
  beforeLoad: async ({ context, location }) => {
    const perms = await ensurePerms(context.queryClient)
    const { canAny } = makeCan(perms)
    const ok = canAny([
      'Donaciones.Solicitud Donaciones:Ver'
    ])
    if (!ok) throw redirect({ to: '/403', search: { from: location.href } })
  },
})

function RouteComponent() {
  const { id } = useParams({ from: "/donaciones/solicitudes/$id" });

  const { solicitudDonacion, loadingSolicitudDonacion, fetchingSolicitudDonacion } = useGetSolicitudesDonacionPorId(id);

  if (loadingSolicitudDonacion || fetchingSolicitudDonacion || !solicitudDonacion) {
    return <><WebLoader /></>
  }

  return <CardDonacion variant="solicitud" solicitud={solicitudDonacion} />
}
