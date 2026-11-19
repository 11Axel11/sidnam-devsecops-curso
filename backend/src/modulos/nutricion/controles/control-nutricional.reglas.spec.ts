import { calcularVariaciones, PuntoDeSerie, RANGOS_CONTROL } from './control-nutricional.reglas';

describe('RANGOS_CONTROL (unidades de P4 y rangos para persona adulta mayor)', () => {
  it('unidades: peso kg · talla/CB/CP/AR cm · FM kgf', () => {
    expect(RANGOS_CONTROL.peso.unidad).toBe('kg');
    expect(RANGOS_CONTROL.talla.unidad).toBe('cm');
    expect(RANGOS_CONTROL.circunferenciaBraquial.unidad).toBe('cm');
    expect(RANGOS_CONTROL.circunferenciaPantorrilla.unidad).toBe('cm');
    expect(RANGOS_CONTROL.alturaRodilla.unidad).toBe('cm');
    expect(RANGOS_CONTROL.fuerzaMuscular.unidad).toBe('kgf');
  });

  it('cada rango es coherente (mínimo < máximo, no negativo) y contiene los valores del criterio CA-14', () => {
    for (const r of Object.values(RANGOS_CONTROL)) {
      expect(r.min).toBeGreaterThanOrEqual(0);
      expect(r.min).toBeLessThan(r.max);
    }
    expect(58.4).toBeGreaterThanOrEqual(RANGOS_CONTROL.peso.min);
    expect(58.4).toBeLessThanOrEqual(RANGOS_CONTROL.peso.max);
    expect(152).toBeGreaterThanOrEqual(RANGOS_CONTROL.talla.min);
    expect(152).toBeLessThanOrEqual(RANGOS_CONTROL.talla.max);
  });
});

describe('calcularVariaciones (RF-NU-02 / CA-15)', () => {
  const punto = (id: number, fecha: string, peso: number, imc: number, anulado = false): PuntoDeSerie => ({
    id,
    fecha,
    peso,
    imc,
    anulado,
  });

  it('serie vacía ⇒ sin variaciones', () => {
    expect(calcularVariaciones([]).size).toBe(0);
  });

  it('el primer control de la serie no tiene variación', () => {
    const r = calcularVariaciones([punto(1, '2026-01-10', 60.1, 26)]);
    expect(r.get(1)).toEqual({ variacionPeso: null, variacionImc: null });
  });

  it('cada control se compara con el inmediatamente anterior, a 1 decimal (sin ruido de coma flotante)', () => {
    const r = calcularVariaciones([punto(1, '2026-01-10', 60.1, 26), punto(2, '2026-04-10', 58.4, 25.3), punto(3, '2026-07-10', 59, 25.6)]);
    expect(r.get(2)).toEqual({ variacionPeso: -1.7, variacionImc: -0.7 }); // 58,4 − 60,1 = −1,7000000000000028 en double
    expect(r.get(3)).toEqual({ variacionPeso: 0.6, variacionImc: 0.3 });
  });

  it('sin cambio ⇒ 0 (nunca -0)', () => {
    const r = calcularVariaciones([punto(1, '2026-01-10', 60, 26), punto(2, '2026-02-10', 60, 26)]);
    expect(Object.is(r.get(2)?.variacionPeso, 0)).toBe(true);
    expect(Object.is(r.get(2)?.variacionImc, 0)).toBe(true);
  });

  it('ordena por fecha aunque la entrada llegue desordenada', () => {
    const r = calcularVariaciones([punto(3, '2026-07-10', 59, 25.6), punto(1, '2026-01-10', 60.1, 26), punto(2, '2026-04-10', 58.4, 25.3)]);
    expect(r.get(1)?.variacionPeso).toBeNull();
    expect(r.get(2)?.variacionPeso).toBe(-1.7);
    expect(r.get(3)?.variacionPeso).toBe(0.6);
  });

  it('dos controles del mismo día se ordenan por orden de registro (id)', () => {
    const r = calcularVariaciones([punto(8, '2026-05-01', 61, 26.4), punto(7, '2026-05-01', 60, 26)]);
    expect(r.get(7)?.variacionPeso).toBeNull();
    expect(r.get(8)?.variacionPeso).toBe(1);
  });

  it('un control anulado no tiene variación y NO sirve de referencia: el siguiente se compara con el último vigente', () => {
    const r = calcularVariaciones([
      punto(1, '2026-01-10', 60, 26),
      punto(2, '2026-02-10', 90, 39, true), // anulado por error de digitación
      punto(3, '2026-03-10', 61, 26.4),
    ]);
    expect(r.get(2)).toEqual({ variacionPeso: null, variacionImc: null });
    expect(r.get(3)).toEqual({ variacionPeso: 1, variacionImc: 0.4 });
  });

  it('si el primero está anulado, el segundo pasa a ser el primero de la serie', () => {
    const r = calcularVariaciones([punto(1, '2026-01-10', 90, 39, true), punto(2, '2026-02-10', 60, 26)]);
    expect(r.get(2)).toEqual({ variacionPeso: null, variacionImc: null });
  });

  it('no modifica la serie recibida', () => {
    const serie = [punto(2, '2026-04-10', 58.4, 25.3), punto(1, '2026-01-10', 60.1, 26)];
    calcularVariaciones(serie);
    expect(serie.map((s) => s.id)).toEqual([2, 1]);
  });
});
