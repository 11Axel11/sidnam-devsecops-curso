import type { QueryClient } from '@tanstack/react-query'
import { redirect } from '@tanstack/react-router'
import { getMePermissions } from './login';
import { norm } from '@/lib/permissionUtils'

// Deuda técnica: este queryKey/queryFn repite el de `meQueryOptions` (hooks/useAuth.tsx), pero
// sin sus opciones (staleTime 60s, refetchOnWindowFocus). No se unifican para no cambiar el
// comportamiento de los ~50 guards existentes. Tampoco se unifica el comodín '*' ni la
// normalización por defecto: makeCan siempre normaliza y nunca acepta '*'; useAuthz es exacto
// y sí acepta '*' salvo que se pase { ignoreWildcard, normalize } (como hace IfPerm).
export async function ensurePerms(qc: QueryClient) {
  const data = await qc.ensureQueryData({
    queryKey: ['me','permissions'],
    queryFn: getMePermissions,
  });
  return data?.data?.permissions ?? [];
}

export function makeCan(perms: string[]) {
  const normList = perms.map(norm);
  const can = (key: string) => normList.includes(norm(key));
  const canAny = (keys: string[]) => keys.some(can);
  const canAll = (keys: string[]) => keys.every(can);
  return { can, canAny, canAll };
}

/** beforeLoad reutilizable: deja pasar si el usuario tiene al menos uno de los permisos; si no, redirige a /403. */
export async function requireAnyPerm(
  context: { queryClient: QueryClient },
  location: { href: string },
  required: string[],
) {
  const perms = await ensurePerms(context.queryClient)
  const { canAny } = makeCan(perms)
  if (!canAny(required)) throw redirect({ to: '/403', search: { from: location.href } })
}
