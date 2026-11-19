import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import PreviewModulo from '@/components/app/PreviewModulo'
import { type LucideIcon, Pill, BrushCleaning, UtensilsCrossed, ClipboardList, House, ContactRound } from 'lucide-react'
import { ensurePerms, makeCan } from '@/services/authHelpers'
import { useEffect, useMemo } from 'react'
import { useAuthz } from '@/hooks/useAuth'
import IfPerm from '@/components/auth/IfPerm'
import {
  categoriasPorSede, nombreCategoria, permsVerCategoria,
} from '@/modules/inventarios/permissions'
import { useSedeStore, type Sede } from '@/store/sedeStore'

const permsEntrada = [
  'Inventariado.Alimentos:Ver',
  'Inventariado.Limpieza:Ver',
  'Inventariado.Medicamentos:Ver',
]

export const Route = createFileRoute('/inventarios/')({
  component: InventariosLayout,
  validateSearch: (search: Record<string, unknown>): { sede?: Sede } => ({
    sede: search.sede === 'hogar' || search.sede === 'cecuidam' ? search.sede : undefined,
  }),
  beforeLoad: async ({ context, location }) => {
    const perms = await ensurePerms(context.queryClient)
    const { canAny } = makeCan(perms)
    if (!canAny(permsEntrada)) throw redirect({ to: '/403', search: { from: location.href } })
  },
})

const iconById: Record<number, LucideIcon> = { 1: UtensilsCrossed, 2: BrushCleaning, 3: Pill }

const descById: Record<number, string> = {
  1: 'Gestiona los inventarios del área de alimentos',
  2: 'Gestiona los inventarios del área de limpieza',
  3: 'Gestiona los inventarios del área de medicamentos',
}

function InventariosLayout() {
  const { sede } = Route.useSearch()
  const setSede = useSedeStore((s) => s.setSede)
  const clearSede = useSedeStore((s) => s.clearSede)
  const { canAny } = useAuthz()

  useEffect(() => {
    if (sede) setSede(sede)
    else clearSede()
  }, [sede, setSede, clearSede])

  const sedeItems = useMemo(() => [
    { title: 'Hogar', url: '/inventarios', search: { sede: 'hogar' }, icon: House,
      description: 'Programa residencial del Hogar de Ancianos San Blas.' },
    { title: 'CECUIDAM', url: '/inventarios', search: { sede: 'cecuidam' }, icon: ContactRound,
      description: 'Centro diurno de atención a personas adultas mayores no residentes.' },
  ], [])

  const categoriaItems = useMemo(() => {
    if (!sede) return []
    return categoriasPorSede[sede]
      .filter((id) => canAny(permsVerCategoria(id)))
      .map((id) => ({
        title: nombreCategoria[id],
        url: `/inventarios/${id}`,
        search: { sede },
        icon: iconById[id] ?? ClipboardList,
        description: descById[id] ?? 'Inventario de esta categoría',
      }))
  }, [canAny, sede])

  if (!sede) {
    return (
      <div>
        <IfPerm anyOf={permsEntrada}>
          <PreviewModulo previewModuleSubItems={sedeItems} />
        </IfPerm>
        <Outlet />
      </div>
    )
  }

  return (
    <div>
      <PreviewModulo previewModuleSubItems={categoriaItems} />
      <Outlet />
    </div>
  )
}
