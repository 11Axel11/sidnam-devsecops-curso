import { hoyCostaRica } from 'src/common/utils/hoyCostaRica';
import { aFechaISO, calcularEdad, errorFechaAnteriorAlNacimiento } from './edad.helper';

describe('calcularEdad (años cumplidos a la fecha de referencia)', () => {
  it('un día ANTES del cumpleaños aún no cumple el año', () => {
    expect(calcularEdad('1940-05-12', '2026-05-11')).toBe(85);
  });

  it('EL DÍA del cumpleaños ya cumple el año (frontera)', () => {
    expect(calcularEdad('1940-05-12', '2026-05-12')).toBe(86);
  });

  it('un día DESPUÉS del cumpleaños y meses más tarde sigue cumplido', () => {
    expect(calcularEdad('1940-05-12', '2026-05-13')).toBe(86);
    expect(calcularEdad('1940-05-12', '2026-12-31')).toBe(86);
  });

  it('mismo día de nacimiento: 0 años; el primer cumpleaños: 1', () => {
    expect(calcularEdad('2000-01-01', '2000-01-01')).toBe(0);
    expect(calcularEdad('2000-01-01', '2000-12-31')).toBe(0);
    expect(calcularEdad('2000-01-01', '2001-01-01')).toBe(1);
  });

  it('nacido un 29 de febrero: cumple el 1 de marzo en los años no bisiestos', () => {
    expect(calcularEdad('2000-02-29', '2001-02-28')).toBe(0);
    expect(calcularEdad('2000-02-29', '2001-03-01')).toBe(1);
    expect(calcularEdad('2000-02-29', '2004-02-28')).toBe(3);
    expect(calcularEdad('2000-02-29', '2004-02-29')).toBe(4);
  });

  it('con una referencia anterior al nacimiento el resultado es negativo (se valida aparte)', () => {
    expect(calcularEdad('2000-01-01', '1999-12-31')).toBeLessThan(0);
  });
});

describe('aFechaISO: fecha de nacimiento tal como la guarda y la lee la app', () => {
  // El frontend envía 'YYYY-MM-DD' → Date a medianoche UTC. El driver (`timezone: '-06:00'`) la escribe
  // en la columna `datetime` como «día anterior 18:00:00» y, al leer, devuelve de nuevo la medianoche UTC.
  const nacimientoLeido = new Date('1935-11-27T00:00:00.000Z'); // fila dev: guardada 1935-11-26 18:00:00

  it('usa los componentes UTC: 1935-11-27 (el día que el usuario digitó)', () => {
    expect(aFechaISO(nacimientoLeido)).toBe('1935-11-27');
  });

  it('un Date a media mañana UTC del mismo día también da el mismo día', () => {
    expect(aFechaISO(new Date('1935-11-27T06:00:00.000Z'))).toBe('1935-11-27');
  });

  it('usar la zona de Costa Rica daría el día ANTERIOR: por eso NO se usa (documenta la trampa)', () => {
    expect(hoyCostaRica(nacimientoLeido)).toBe('1935-11-26');
    expect(aFechaISO(nacimientoLeido)).not.toBe(hoyCostaRica(nacimientoLeido));
  });

  it('edad en la frontera del cumpleaños con la fecha de nacimiento leída así', () => {
    const nacimiento = aFechaISO(nacimientoLeido); // 1935-11-27
    expect(calcularEdad(nacimiento, '2026-11-26')).toBe(90); // víspera: aún no cumple los 91
    expect(calcularEdad(nacimiento, '2026-11-27')).toBe(91); // el día: cumple 91
    expect(calcularEdad(nacimiento, '2026-11-28')).toBe(91);
  });
});

describe('errorFechaAnteriorAlNacimiento', () => {
  it('rechaza una fecha anterior al nacimiento', () => {
    expect(errorFechaAnteriorAlNacimiento('1935-11-26', '1935-11-27')).toMatch(/anterior a la fecha de nacimiento/);
  });

  it('acepta el mismo día y fechas posteriores', () => {
    expect(errorFechaAnteriorAlNacimiento('1935-11-27', '1935-11-27')).toBeNull();
    expect(errorFechaAnteriorAlNacimiento('2026-10-21', '1935-11-27')).toBeNull();
  });

  it('la etiqueta completa el mensaje', () => {
    expect(errorFechaAnteriorAlNacimiento('1900-01-01', '1935-11-27', 'de la aplicación')).toMatch(/La fecha de la aplicación/);
  });
});
