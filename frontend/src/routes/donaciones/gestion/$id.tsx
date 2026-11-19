import WebLoader from '@/components/Loader';
import CardDonacion from '@/modules/donaciones/components/CardDonacion';
import { useGetRegistroDonacionPorId } from '@/modules/donaciones/hooks/gestionDonacion/gestionDonacionesHooks';
import { ensurePerms, makeCan } from '@/services/authHelpers';
import { createFileRoute, redirect, useParams } from '@tanstack/react-router'
import z from 'zod';

export const Route = createFileRoute('/donaciones/gestion/$id')({
  component: RouteComponent,
  parseParams: (params) => ({
    id: z.coerce.number().int().positive().parse(params.id),
  }),
  beforeLoad: async ({ context, location }) => {
    const perms = await ensurePerms(context.queryClient)
    const { canAny } = makeCan(perms)
    const ok = canAny([
      'Donaciones.Gestión Donaciones:Ver'
    ])
    if (!ok) throw redirect({ to: '/403', search: { from: location.href } })
  },
})

function RouteComponent() {
  const { id } = useParams({ from: "/donaciones/gestion/$id" });

  const { registroDonacion, fetchingRegistroDonacion, loadingRegistroDonacion } = useGetRegistroDonacionPorId(id);

  if (loadingRegistroDonacion || fetchingRegistroDonacion || !registroDonacion) {
    return <><WebLoader /></>
  }

  return (
    <section className="px-2 pb-4">
      <CardDonacion variant="registro" registro={registroDonacion} />
    </section>
  )
}
