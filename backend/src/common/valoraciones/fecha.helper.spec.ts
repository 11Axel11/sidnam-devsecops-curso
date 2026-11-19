import {
  ahoraSinFraccion,
  erroresDeRango,
  errorDeFecha,
  errorDeFechaHora,
  esFechaValida,
  finDelDiaCR,
  inicioDelDiaCR,
  parsearFechaHora,
  TOLERANCIA_RELOJ_MS,
} from './fecha.helper';

describe('esFechaValida / errorDeFecha', () => {
  it('acepta fechas reales y rechaza las que no existen o tienen otro formato', () => {
    expect(esFechaValida('2024-02-29')).toBe(true);
    expect(esFechaValida('2026-02-29')).toBe(false);
    expect(esFechaValida('2026-02-30')).toBe(false);
    expect(esFechaValida('2026-13-01')).toBe(false);
    expect(esFechaValida('21/10/2026')).toBe(false);
    expect(esFechaValida('2026-1-1')).toBe(false);
  });

  it('conserva los mensajes originales de las valoraciones (etiqueta por defecto)', () => {
    expect(errorDeFecha('xx', '2026-10-21')).toBe('La fecha de la valoración no es una fecha válida (formato YYYY-MM-DD)');
    expect(errorDeFecha('2026-10-22', '2026-10-21')).toBe('La fecha de la valoración no puede ser posterior a hoy');
    expect(errorDeFecha('2026-10-21', '2026-10-21')).toBeNull();
  });

  it('la etiqueta personaliza el mensaje', () => {
    expect(errorDeFecha('2026-10-22', '2026-10-21', 'del control')).toBe('La fecha del control no puede ser posterior a hoy');
    expect(errorDeFecha('mal', '2026-10-21', 'de la aplicación')).toMatch(/^La fecha de la aplicación no es una fecha válida/);
  });
});

describe('parsearFechaHora', () => {
  it('SIN offset se interpreta como hora de Costa Rica (UTC-6)', () => {
    expect(parsearFechaHora('2026-10-21T14:30')?.toISOString()).toBe('2026-10-21T20:30:00.000Z');
    expect(parsearFechaHora('2026-10-21T14:30:15')?.toISOString()).toBe('2026-10-21T20:30:15.000Z');
  });

  it('con Z u offset explícito se respeta', () => {
    expect(parsearFechaHora('2026-10-21T14:30:00Z')?.toISOString()).toBe('2026-10-21T14:30:00.000Z');
    expect(parsearFechaHora('2026-10-21T14:30:00-06:00')?.toISOString()).toBe('2026-10-21T20:30:00.000Z');
    expect(parsearFechaHora('2026-10-21T14:30:00+01:00')?.toISOString()).toBe('2026-10-21T13:30:00.000Z');
  });

  it('descarta la fracción de segundo (la columna guarda segundos enteros)', () => {
    expect(parsearFechaHora('2026-10-21T14:30:15.987')?.toISOString()).toBe('2026-10-21T20:30:15.000Z');
    expect(parsearFechaHora('2026-10-21T14:30:15.987Z')?.toISOString()).toBe('2026-10-21T14:30:15.000Z');
  });

  it('cerca de la medianoche el día depende de la zona, no del servidor', () => {
    expect(parsearFechaHora('2026-10-21T23:59')?.toISOString()).toBe('2026-10-22T05:59:00.000Z');
    expect(parsearFechaHora('2026-10-21T00:00')?.toISOString()).toBe('2026-10-21T06:00:00.000Z');
  });

  it.each([
    ['formato libre', 'ayer por la tarde'],
    ['solo fecha', '2026-10-21'],
    ['con espacio en lugar de T', '2026-10-21 14:30'],
    ['mes 13', '2026-13-21T10:00'],
    ['día inexistente', '2026-02-30T10:00'],
    ['hora 24', '2026-10-21T24:00'],
    ['minuto 60', '2026-10-21T10:60'],
    ['segundo 60', '2026-10-21T10:00:60'],
    ['offset de hora 24', '2026-10-21T10:00:00+24:00'],
    ['cadena vacía', ''],
  ])('rechaza %s', (_caso, valor) => {
    expect(parsearFechaHora(valor)).toBeNull();
  });
});

describe('ahoraSinFraccion', () => {
  it('trunca los milisegundos', () => {
    expect(ahoraSinFraccion(new Date('2026-10-21T20:30:15.987Z')).toISOString()).toBe('2026-10-21T20:30:15.000Z');
  });
});

describe('errorDeFechaHora', () => {
  const ahora = new Date('2026-10-21T20:30:00.000Z');

  it('null (no interpretable) ⇒ mensaje de formato', () => {
    expect(errorDeFechaHora(null, ahora)).toMatch(/no es válida \(formato ISO 8601/);
  });

  it('el pasado es válido', () => {
    expect(errorDeFechaHora(new Date('2026-10-20T08:00:00.000Z'), ahora)).toBeNull();
  });

  it('dentro de la tolerancia de reloj es válido; justo más allá, no', () => {
    expect(errorDeFechaHora(new Date(ahora.getTime() + TOLERANCIA_RELOJ_MS), ahora)).toBeNull();
    expect(errorDeFechaHora(new Date(ahora.getTime() + TOLERANCIA_RELOJ_MS + 1000), ahora)).toMatch(
      /no puede ser posterior a la fecha y hora actual/,
    );
  });

  it('la etiqueta completa el mensaje', () => {
    expect(errorDeFechaHora(null, ahora, 'de la caída')).toMatch(/La fecha y hora de la caída/);
  });
});

describe('límites del día en Costa Rica', () => {
  it('inicio y fin del día', () => {
    expect(inicioDelDiaCR('2026-10-21').toISOString()).toBe('2026-10-21T06:00:00.000Z');
    expect(finDelDiaCR('2026-10-21').toISOString()).toBe('2026-10-22T05:59:59.999Z');
  });
});

describe('erroresDeRango (desde/hasta)', () => {
  it('sin filtros o con un rango coherente: sin errores', () => {
    expect(erroresDeRango()).toEqual([]);
    expect(erroresDeRango('2026-01-01')).toEqual([]);
    expect(erroresDeRango(undefined, '2026-12-31')).toEqual([]);
    expect(erroresDeRango('2026-10-21', '2026-10-21')).toEqual([]);
  });

  it('fechas inexistentes y rango invertido', () => {
    expect(erroresDeRango('2026-02-30')).toEqual(['desde no es una fecha válida (formato YYYY-MM-DD)']);
    expect(erroresDeRango('2026-01-01', '2026-13-01')).toEqual(['hasta no es una fecha válida (formato YYYY-MM-DD)']);
    expect(erroresDeRango('2026-10-22', '2026-10-21')).toEqual(['desde no puede ser posterior a hasta']);
  });
});
