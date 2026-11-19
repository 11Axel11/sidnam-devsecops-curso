import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { queryClient } from "@/lib/queryClient";
import { LOGIN_PATH, isPublicPath } from "@/lib/authPaths";
import { API_URL } from './environment';

// En desarrollo, VITE_API_URL viene de .env.local y apunta al backend local
// (ver .env.local en la raíz del proyecto). En producción (Vercel) no se
// define esa variable, así que cae al fallback de siempre.
const sidnamAPI = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

const AUTH_CALL = /\/autenticacion\/(login|refresh|logout)/;

// Refresh tokens rotate, so concurrent 401s must share a single refresh call.
let refreshing: Promise<void> | null = null;

// Keep the /me query as "logged out" instead of removing it: a removed query that is still
// observed refetches immediately, and that refetch would 401 → refresh → clear again forever.
export function clearSession() {
  queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' });
  queryClient.setQueryData(['me', 'permissions'], null);
}

sidnamAPI.interceptors.response.use(undefined, async (error: AxiosError) => {
  const original = error.config as RetriableConfig | undefined;
  if (
    error.response?.status !== 401 ||
    !original ||
    original._retry ||
    AUTH_CALL.test(original.url ?? '')
  ) {
    throw error;
  }

  original._retry = true;
  refreshing ??= sidnamAPI
    .post('/autenticacion/refresh')
    .then(() => {})
    .finally(() => { refreshing = null; });

  try {
    await refreshing;
  } catch {
    clearSession();
    if (!isPublicPath(window.location.pathname)) {
      window.location.replace(LOGIN_PATH);
    }
    throw error;
  }
  return sidnamAPI(original);
});

export default sidnamAPI
