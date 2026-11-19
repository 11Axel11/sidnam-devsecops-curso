import WebLoader from '@/components/Loader';
import CardContenidoGeneralResidente from '@/modules/residentes/components/CardGeneralExpedienteResidente';
import { useGetExpedienteResidente } from '@/modules/residentes/hooks/expedientesHooks';
import { ensurePerms, makeCan } from '@/services/authHelpers';
import { createFileRoute, redirect, useParams } from '@tanstack/react-router'

export const Route = createFileRoute('/residentes/$id/')({
  component: RouteComponent, 
  beforeLoad: async ({ context, location }) => {
    const perms = await ensurePerms(context.queryClient)
    const { canAny } = makeCan(perms)
    const ok = canAny([
      'Residencia.General Expedientes:Ver',
    ])
    if (!ok) throw redirect({ to: '/403', search: { from: location.href } })
  },
})

function RouteComponent() {
  const { id } = useParams({ from: "/residentes/$id/" });
  const { expedienteResidente, loadingExpedienteResidente, fetchingExpedienteResidente} = useGetExpedienteResidente(id);
  
  if (loadingExpedienteResidente || fetchingExpedienteResidente){
    return <WebLoader/>
  }
  
  if (!expedienteResidente) {
    return <p className="text-center mt-5 text-gray-500">No se encontró el expediente del residente.</p>; 
  }

  return <section className="px-4">
    <div className="mx-auto w-full max-w-7xl">
      <CardContenidoGeneralResidente expediente={expedienteResidente}/>
    </div>
  </section>
}