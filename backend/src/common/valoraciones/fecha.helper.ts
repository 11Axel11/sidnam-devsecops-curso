/**
 * Validación de fechas de los registros clínicos del Bloque B (compartida por Terapia Física y
 * Nutrición): 'YYYY-MM-DD', fecha real del calendario y no posterior a hoy (hora de Costa Rica; ver
 * `hoyCostaRica` en src/common/utils/hoyCostaRica.ts), más fecha-hora y rangos `desde/hasta`.
 * Funciones puras, sin base de datos.
 */

/** Costa Rica no tiene horario de verano: UTC-6 todo el año (igual que `timezone` del driver en app.module.ts). */
export const OFFSET_COSTA_RICA = '-06:00';

/**
 * Margen de reloj al validar «no futura» una fecha-hora enviada por el cliente: un navegador adelantado
 * unos segundos o minutos no debe ver rechazado un registro hecho «ahora».
 */
export const TOLERANCIA_RELOJ_MS = 5 * 60 * 1000;

/** 'YYYY-MM-DD' que además sea una fecha real del calendario. */
export function esFechaValida(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const [a, m, d] = fecha.split('-').map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d));
  return dt.getUTCFullYear() === a && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * Mensaje de error o null. `hoy` en 'YYYY-MM-DD' (hora de Costa Rica). Comparación lexicográfica válida en ISO.
 * `etiqueta` completa la frase «La fecha …» (por defecto la de una valoración).
 */
export function errorDeFecha(fecha: string, hoy: string, etiqueta = 'de la valoración'): string | null {
  if (!esFechaValida(fecha)) return `La fecha ${etiqueta} no es una fecha válida (formato YYYY-MM-DD)`;
  if (fecha > hoy) return `La fecha ${etiqueta} no puede ser posterior a hoy`;
  return null;
}

const PATRON_FECHA_HORA = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})?$/;

/**
 * Convierte una fecha-hora ISO 8601 en `Date`, o null si no es válida.
 *  - Con `Z` u offset (`-06:00`) se respeta tal cual.
 *  - SIN offset se interpreta como hora de Costa Rica (UTC-6): es lo que escribe quien registra.
 *  - Se descartan las fracciones de segundo: la columna `datetime` guarda segundos enteros, y así lo
 *    guardado es exactamente lo que se validó.
 * Acepta `YYYY-MM-DDTHH:mm`, `…:ss` y `…:ss.SSS`.
 */
export function parsearFechaHora(valor: string): Date | null {
  const m = PATRON_FECHA_HORA.exec(valor);
  if (!m) return null;
  const [, fecha, hh, mm, ss = '00', offset = OFFSET_COSTA_RICA] = m;
  if (!esFechaValida(fecha)) return null;
  if (Number(hh) > 23 || Number(mm) > 59 || Number(ss) > 59) return null;
  if (offset !== 'Z') {
    const [oh, om] = offset.slice(1).split(':').map(Number);
    if (oh > 23 || om > 59) return null;
  }
  const dt = new Date(`${fecha}T${hh}:${mm}:${ss}.000${offset}`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/** El instante `ahora` sin fracción de segundo (para fechas-hora por defecto). */
export function ahoraSinFraccion(ahora: Date = new Date()): Date {
  return new Date(Math.floor(ahora.getTime() / 1000) * 1000);
}

/**
 * Mensaje de error o null para una fecha-hora ya convertida (`null` = no se pudo interpretar).
 * No puede ser posterior a `ahora` más la tolerancia de reloj.
 */
export function errorDeFechaHora(fechaHora: Date | null, ahora: Date, etiqueta = 'del evento'): string | null {
  if (!fechaHora) {
    return `La fecha y hora ${etiqueta} no es válida (formato ISO 8601, por ejemplo 2026-10-21T14:30)`;
  }
  if (fechaHora.getTime() > ahora.getTime() + TOLERANCIA_RELOJ_MS) {
    return `La fecha y hora ${etiqueta} no puede ser posterior a la fecha y hora actual`;
  }
  return null;
}

/** Primer instante del día `fecha` ('YYYY-MM-DD') en Costa Rica. */
export function inicioDelDiaCR(fecha: string): Date {
  return new Date(`${fecha}T00:00:00.000${OFFSET_COSTA_RICA}`);
}

/** Último instante del día `fecha` ('YYYY-MM-DD') en Costa Rica. */
export function finDelDiaCR(fecha: string): Date {
  return new Date(`${fecha}T23:59:59.999${OFFSET_COSTA_RICA}`);
}

/** Errores del filtro `desde/hasta` (cada uno opcional): fechas reales y `desde` no posterior a `hasta`. */
export function erroresDeRango(desde?: string, hasta?: string): string[] {
  const errores: string[] = [];
  if (desde !== undefined && !esFechaValida(desde)) errores.push('desde no es una fecha válida (formato YYYY-MM-DD)');
  if (hasta !== undefined && !esFechaValida(hasta)) errores.push('hasta no es una fecha válida (formato YYYY-MM-DD)');
  if (!errores.length && desde !== undefined && hasta !== undefined && desde > hasta) {
    errores.push('desde no puede ser posterior a hasta');
  }
  return errores;
}
