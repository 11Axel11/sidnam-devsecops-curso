import { useMemo } from "react";
import { getMePermissions, logout as logoutRequest } from "@/services/login";
import { useQuery } from "@tanstack/react-query";
import { clearSession } from "@/api/apiConfig";
import { norm } from "@/lib/permissionUtils";

export const meQueryOptions = {
  queryKey: ['me', 'permissions'],
  queryFn: getMePermissions,
  staleTime: 60_000,
  refetchOnWindowFocus: true,
} as const;

export async function logout(goToLogin: () => Promise<void>) {
  try {
    await logoutRequest();
  } catch (err) {
    console.error("Error cerrando sesión en el servidor", err);
  }
  clearSession();
  await goToLogin();
}

export function useAuth() {
  const { data, isLoading } = useQuery(meQueryOptions);
  const user = data?.data?.user ?? null;

  return {
    user,
    isAuthenticated: !!user,
    name: user?.name ?? null,
    idUsuario: user ? Number(user.id) : null,
    loading: isLoading,
  };
}

export function useAuthz(opts?: { ignoreWildcard?: boolean; normalize?: boolean }) {
  const { data, isLoading, isError, error } = useQuery(meQueryOptions);

  const perms = useMemo(() => {
    const raw = (data?.data?.permissions ?? []) as string[];
    return opts?.normalize ? raw.map(norm) : raw;
  }, [data?.data?.permissions, opts?.normalize]);

  const has = (p: string) => {
    const key = opts?.normalize ? norm(p) : p;
    const allowWildcard = !opts?.ignoreWildcard;
    return perms.includes(key) || (allowWildcard && perms.includes('*'));
  };

  const hasAny = (list: string[]) => list.some(has);
  const hasAll = (list: string[]) => list.every(has);

  return { can: has, canAny: hasAny, canAll: hasAll, isLoading, isError, error, perms };
}