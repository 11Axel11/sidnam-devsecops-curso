import { createFileRoute, redirect } from '@tanstack/react-router'
import { ensurePerms, makeCan } from '@/services/authHelpers'
import { esCategoriaLegacy, nombreCategoria, permsSalidasCategoria } from '@/modules/inventarios/permissions'
import MovimientosPage from '@/modules/inventarios/components/MovimientosPage'

export const Route = createFileRoute('/inventarios/$categoryId/salidas')({
  beforeLoad: async ({ context, params, location }) => {
    if (esCategoriaLegacy(params.categoryId)) throw redirect({ to: '/inventarios/$categoryId', params, search: { sede: 'hogar' } });
    const perms = await ensurePerms(context.queryClient);
    const { canAny } = makeCan(perms);
    if (!canAny(permsSalidasCategoria(params.categoryId))) throw redirect({ to: '/403', search: { from: location.href } });
  },
  component: SalidasPage,
})

function SalidasPage() {
  const { categoryId } = Route.useParams()
  const { sede } = Route.useSearch()
  if (!sede) return null
  return <MovimientosPage tipo="salidas" sede={sede} categoryId={Number(categoryId)} nombreCategoria={nombreCategoria[categoryId] ?? ''} />
}
