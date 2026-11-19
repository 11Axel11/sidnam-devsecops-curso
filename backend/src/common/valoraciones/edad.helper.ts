/**
 * Edad del residente «al momento» de un registro (regla 7 de docs/CLAUDE.md, RN-04): se calcula desde
 * `residente.fecha_nacimiento` a la fecha del registro, se ALMACENA y no se recalcula. Nunca se lee
 * `residente.edad` (desnormalizado). Funciones puras, sin base de datos.
 */

/**
 * 'YYYY-MM-DD' de un `Date` leído de la columna `datetime` de la fecha de nacimiento, por sus
 * componentes **UTC**.
 *
 * El frontend envía `YYYY-MM-DD` (medianoche UTC) y el driver (`timezone: '-06:00'`) lo escribe como
 * `día anterior 18:00:00`; al leerlo devuelve de nuevo la medianoche UTC. Por eso el día correcto sale
 * de los componentes UTC: usar la zona de Costa Rica daría el día ANTERIOR. Verificado en dev:
 * fila guardada `1935-11-26 18:00:00` → `Date` `1935-11-27T00:00:00Z` → fecha de nacimiento 1935-11-27.
 */
export function aFechaISO(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

/**
 * Años cumplidos a la fecha `referencia`. Ambas en 'YYYY-MM-DD'. Quien nace un 29 de febrero cumple el
 * 1 de marzo en los años no bisiestos. Con `referencia` anterior al nacimiento el resultado es
 * negativo: valídelo antes con `errorFechaAnteriorAlNacimiento`.
 */
export function calcularEdad(nacimiento: string, referencia: string): number {
  const [an, mn, dn] = nacimiento.split('-').map(Number);
  const [ar, mr, dr] = referencia.split('-').map(Number);
  let edad = ar - an;
  if (mr < mn || (mr === mn && dr < dn)) edad--;
  return edad;
}

/** Mensaje de error o null: una fecha de registro no puede ser anterior al nacimiento del residente. */
export function errorFechaAnteriorAlNacimiento(fecha: string, nacimiento: string, etiqueta = 'del control'): string | null {
  return fecha < nacimiento ? `La fecha ${etiqueta} no puede ser anterior a la fecha de nacimiento del residente` : null;
}
