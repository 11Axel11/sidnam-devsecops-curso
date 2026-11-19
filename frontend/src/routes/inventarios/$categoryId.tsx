import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { ensurePerms, makeCan } from '@/services/authHelpers'
import SubCategoria from '@/components/app/SubCategoria'
import { ClipboardList, LogIn, LogOut } from 'lucide-react'
import { useAuthz } from '@/hooks/useAuth';
import { useEffect } from 'react';
import {
  esCategoriaLegacy, categoriasPorSede, permsVerCategoria,
  permsInventarioCategoria, permsEntradasCategoria,
} from '@/modules/inventarios/permissions';
import { useSedeStore, type Sede } from '@/store/sedeStore';
//import { useCategoriasSede } from '@/modules/inventarios/hooks/existenciaHooks';

export const Route = createFileRoute('/inventarios/$categoryId')({
  validateSearch: (search: Record<string, unknown>): { sede?: Sede; inventarioId?: number } => ({
    sede: search.sede === 'hogar' || search.sede === 'cecuidam' ? search.sede : undefined,
    inventarioId: search.inventarioId ? Number(search.inventarioId) || undefined : undefined,
  }),
  beforeLoad: async ({ context, params, location, search }) => {
    const legacy = esCategoriaLegacy(params.categoryId);

    if (!search.sede) {
      const guardada = useSedeStore.getState().sede;
      if (guardada) throw redirect({ to: location.pathname, search: { ...search, sede: guardada } as never });
      throw redirect({ to: '/inventarios', search: { sede: undefined } });
    }
    if (legacy && search.sede === 'cecuidam') {
      throw redirect({ to: '/inventarios', search: { sede: 'cecuidam' } });
    }

    if (!categoriasPorSede[search.sede].includes(Number(params.categoryId))) {
      throw redirect({ to: '/404' });
    }

    const perms = await ensurePerms(context.queryClient);
    const { canAny } = makeCan(perms);
    if (!canAny(permsVerCategoria(params.categoryId))) {
      throw redirect({ to: '/403', search: { from: location.href } });
    }
  },
  component: CategoryLayout,
});

function CategoryLayout() {
  const { categoryId } = Route.useParams();
  const { sede } = Route.useSearch();
  const { canAny } = useAuthz();
  const setSede = useSedeStore((s) => s.setSede);
  //const { data: categorias } = useCategoriasSede(sede);

  useEffect(() => { if (sede) setSede(sede); }, [sede, setSede]);

  if (!sede) return null;

  const legacy = esCategoriaLegacy(categoryId);
  //const nombre = categorias?.find((c) => String(c.id) === categoryId)?.nombre ?? 'Inventario';

  const items = [
    ...(!legacy ? [{
      title: 'Inventario',
      url: `/inventarios/${categoryId}/inventario`,
      icon: ClipboardList,
      search: { sede },
      perms: permsInventarioCategoria(categoryId),
    }] : []),
    {
      title: 'Entradas',
      url: `/inventarios/${categoryId}/entradas`,
      icon: LogIn,
      search: { sede },
      perms: permsEntradasCategoria(categoryId),
    },
    ...(!legacy ? [{
      title: 'Salidas',
      url: `/inventarios/${categoryId}/salidas`,
      icon: LogOut,
      search: { sede },
      perms: permsEntradasCategoria(categoryId),
    }] : [])
  ].filter(i => canAny(i.perms));

  return (
    <div>
      <SubCategoria subCategoriasItems={items} />
      <Outlet />
    </div>
  );
}
