import FormularioVoluntariado from '@/modules/voluntariado/components/FormularioVoluntariado'
import { ensurePerms, makeCan } from '@/services/authHelpers'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/voluntarios/gestion/crear')({
  component: RouteComponent,
    beforeLoad: async ({ context, location }) => {
      const perms = await ensurePerms(context.queryClient)
      const { canAny } = makeCan(perms)
      const ok = canAny([
        'Voluntariado.Gestion Voluntariado:Crear',
      ])
      if (!ok) throw redirect({ to: '/403', search: { from: location.href } })
    },
})

function RouteComponent() {
  return <div className='flex justify-center'>

    <FormularioVoluntariado/>

  </div>
}
