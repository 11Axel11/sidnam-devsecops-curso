export function mensajeError(err: unknown, fallback = 'Ocurrió un error, intenta de nuevo.'): string {
  if (statusDe(err) === 403) return 'No tienes permiso para realizar esta acción.';
  const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(' · ');
  return msg || fallback;
}

// Sin respuesta del servidor (corte de red, servidor caído): el llamador conserva lo escrito.
export const esErrorDeRed = (err: unknown): boolean => !(err as { response?: unknown })?.response;

export const statusDe = (err: unknown): number | undefined =>
  (err as { response?: { status?: number } })?.response?.status;

export const dataDe = <T = Record<string, unknown>>(err: unknown): T | undefined =>
  (err as { response?: { data?: T } })?.response?.data;
