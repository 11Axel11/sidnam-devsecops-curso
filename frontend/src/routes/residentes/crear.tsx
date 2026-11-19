import FormExpedienteResidente from '@/modules/residentes/components/FormExpedienteResidente'
import { ensurePerms, makeCan } from '@/services/authHelpers'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/residentes/crear')({
  component: RouteComponent,  
  beforeLoad: async ({ context, location }) => {
    const perms = await ensurePerms(context.queryClient)
    const { canAny } = makeCan(perms)
    const ok = canAny([
      'Residencia.General Expedientes:Crear',
    ])
    if (!ok) throw redirect({ to: '/403', search: { from: location.href } })
  },
})

function RouteComponent() {
  
  return <div className='flex justify-center'>
    <FormExpedienteResidente/>
  </div>
}
