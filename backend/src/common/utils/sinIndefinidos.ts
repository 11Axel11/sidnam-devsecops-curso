/** Quita las claves `undefined` (campos no enviados) conservando los `null` (limpiar el campo en un PATCH). */
export function sinIndefinidos<T extends object>(dto: T): Record<string, any> {
  return Object.fromEntries(Object.entries(dto).filter(([, valor]) => valor !== undefined));
}
