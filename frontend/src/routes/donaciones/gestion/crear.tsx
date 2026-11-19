import { createFileRoute, redirect } from '@tanstack/react-router'
import FormularioRegistroDonacion from '@/modules/donaciones/components/FormularioRegistroDonacion'
import { ensurePerms, makeCan } from '@/services/authHelpers'

export const Route = createFileRoute('/donaciones/gestion/crear')({
  component: RouteComponent,
  beforeLoad: async ({ context, location }) => {
    const perms = await ensurePerms(context.queryClient)
    const { canAny } = makeCan(perms)
    const ok = canAny([
      'Donaciones.Gestión Donaciones:Crear'
    ])
    if (!ok) throw redirect({ to: '/403', search: { from: location.href } })
  },
})

function RouteComponent() {
  return <div className='flex justify-center'>
    <FormularioRegistroDonacion />
  </div>
}
