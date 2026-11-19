/**
 * Fecha de hoy en Costa Rica como 'YYYY-MM-DD' (UTC-6, sin horario de verano).
 * El servidor puede correr en UTC; usar `new Date().toISOString()` daría el día
 * siguiente después de las 18:00 hora local.
 */
export function hoyCostaRica(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora);
}
