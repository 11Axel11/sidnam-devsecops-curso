// Normaliza un permiso para comparar sin distinguir tildes, mayúsculas ni espacios repetidos.
// Compartido por los guards de ruta (authHelpers.ts) y por useAuthz (hooks/useAuth.tsx).
export const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
