import WebLoader from '@/components/Loader';
import CardContenidoEnfermeriaResidente from '@/modules/residentes/components/enfermeria/CardEnfermeriaExpedienteResidente';
import { useGetExpedienteResidenteEnfermeria } from '@/modules/residentes/hooks/enfermeria/enfermeriaHooks';
import { ensurePerms, makeCan } from '@/services/authHelpers';
import { createFileRoute, redirect, useParams } from '@tanstack/react-router'

export const Route = createFileRoute('/residentes/$id/enfermeria/')({
  component: RouteComponent,
  beforeLoad: async ({ context, location }) => {
    const perms = await ensurePerms(context.queryClient)
    const { canAny } = makeCan(perms)
    const ok = canAny([
      'Residencia.Enfermería:Ver',
    ])
    if (!ok) throw redirect({ to: '/403', search: { from: location.href } })
  },
})

function RouteComponent() {
  const { id } = useParams({ from: "/residentes/$id/enfermeria/" });

  const { expedienteResidenteEnfermeria, loadingExpedienteResidenteEnfermeria,
    fetchingExpedienteResidenteEnfermeria } = useGetExpedienteResidenteEnfermeria(id);

  if (loadingExpedienteResidenteEnfermeria || fetchingExpedienteResidenteEnfermeria) {
    return <WebLoader />
  }

  if (!expedienteResidenteEnfermeria) {
    return <WebLoader />
  }
  return <section className="px-4">
    <div className="mx-auto w-full max-w-7xl">
      <CardContenidoEnfermeriaResidente expediente={expedienteResidenteEnfermeria} />
    </div>
  </section>
}
