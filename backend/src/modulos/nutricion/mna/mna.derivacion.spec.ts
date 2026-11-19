import { MNA_ITEM_Q_PUNTAJE } from 'src/common/constants/mna.constant';
import {
  enDecimas,
  MOTIVO_SIN_VINCULO,
  puntosItemQPorCb,
  puntosItemRPorCp,
  redondearMedidaAlEntero,
  resolverItemQ,
  resolverItemR,
} from './mna.reglas';

/**
 * Ítems Q y R derivados del control vinculado (decisión de la Jefatura, octubre 2026). La medida se REDONDEA AL ENTERO
 * MÁS CERCANO (el .5 sube) y luego se aplica la tabla del Anexo D:
 *   Q: 0 si CB < 21 · 0,5 si 21 ≤ CB ≤ 22 · 1,0 si CB > 22   ⇒ cortes efectivos: < 20,5 · 20,5 a < 22,5 · ≥ 22,5
 *   R: 0 si CP < 31 · 1 si CP ≥ 31                           ⇒ cortes efectivos: < 30,5 · ≥ 30,5
 * Todo en décimas enteras (sin errores de punto flotante).
 */
describe('redondeo en décimas enteras', () => {
  it.each([
    [20.4, 20], [20.5, 21], [20.9, 21], [21, 21], [22, 22], [22.4, 22], [22.5, 23], [23, 23],
    [30.4, 30], [30.5, 31], [31, 31], [0, 0], [0.4, 0], [0.5, 1], [99.9, 100],
  ])('%p ⇒ %p', (medida, esperado) => {
    expect(redondearMedidaAlEntero(medida)).toBe(esperado);
  });

  it('enDecimas no arrastra el error binario (0.1 + 0.2, 21.4 × 10, 1.1 × 3…)', () => {
    expect(enDecimas(0.1 + 0.2)).toBe(3);
    expect(enDecimas(21.4)).toBe(214);
    expect(enDecimas(1.1 * 3)).toBe(33);
    expect(enDecimas(20.7)).toBe(207);
  });
});

describe('puntosItemQPorCb (circunferencia braquial)', () => {
  it.each([
    [20.4, 0],
    [20.5, 0.5],
    [20.9, 0.5],
    [21, 0.5],
    [22, 0.5],
    [22.4, 0.5],
    [22.5, 1],
    [23, 1],
    [10, 0],
    [40, 1],
  ])('CB %p ⇒ itemQ %p', (cb, puntos) => {
    expect(puntosItemQPorCb(cb)).toBe(puntos);
  });

  it('el valor máximo es 1,0 (decisión P2), no 2,0', () => {
    expect(puntosItemQPorCb(30)).toBe(MNA_ITEM_Q_PUNTAJE);
    expect(MNA_ITEM_Q_PUNTAJE).toBe(1);
  });

  it('BARRIDO de 0,0 a 100,0 en décimas: coincide con los cortes efectivos (< 20,5 · < 22,5 · ≥ 22,5)', () => {
    for (let t = 0; t <= 1000; t++) {
      const esperado = t < 205 ? 0 : t < 225 ? 0.5 : 1;
      expect({ cb: t / 10, puntos: puntosItemQPorCb(t / 10) }).toEqual({ cb: t / 10, puntos: esperado });
    }
  });

  it('equivale a «redondear y aplicar la tabla literal del anexo» (< 21 · 21 a 22 · > 22)', () => {
    for (let t = 0; t <= 1000; t++) {
      const r = redondearMedidaAlEntero(t / 10);
      const tabla = r < 21 ? 0 : r <= 22 ? 0.5 : 1;
      expect(puntosItemQPorCb(t / 10)).toBe(tabla);
    }
  });
});

describe('puntosItemRPorCp (circunferencia de la pantorrilla)', () => {
  it.each([
    [30.4, 0],
    [30.5, 1],
    [30.9, 1],
    [31, 1],
    [31.4, 1],
    [20, 0],
    [45, 1],
  ])('CP %p ⇒ itemR %p', (cp, puntos) => {
    expect(puntosItemRPorCp(cp)).toBe(puntos);
  });

  it('BARRIDO de 0,0 a 100,0 en décimas: coincide con los cortes efectivos (< 30,5 · ≥ 30,5)', () => {
    for (let t = 0; t <= 1000; t++) {
      expect({ cp: t / 10, puntos: puntosItemRPorCp(t / 10) }).toEqual({ cp: t / 10, puntos: t < 305 ? 0 : 1 });
    }
  });
});

describe('resolverItemQ / resolverItemR (mismo estilo que resolverItemF)', () => {
  describe('CON control que trae la medida', () => {
    it('omitido o null ⇒ se deriva (valor, origen control, solo lectura, medida y medida redondeada)', () => {
      for (const manual of [undefined, null]) {
        expect(resolverItemQ(manual, 21.4, true)).toEqual({
          item: { valor: 0.5, origen: 'control', soloLectura: true, medida: 21.4, medidaRedondeada: 21 },
          errores: [],
        });
      }
      expect(resolverItemR(undefined, 30.5, true)).toEqual({
        item: { valor: 1, origen: 'control', soloLectura: true, medida: 30.5, medidaRedondeada: 31 },
        errores: [],
      });
    });

    it('manual IGUAL al derivado ⇒ se acepta (también 0 y 0,5)', () => {
      expect(resolverItemQ(0.5, 22.4, true).errores).toEqual([]);
      expect(resolverItemQ(0, 20.4, true).errores).toEqual([]);
      expect(resolverItemQ(1, 22.5, true).errores).toEqual([]);
      expect(resolverItemR(0, 30.4, true).errores).toEqual([]);
    });

    it('manual DISTINTO ⇒ 400 con el texto exacto (CB/CP, medida, redondeo y valor derivado)', () => {
      expect(resolverItemQ(1, 21.4, true).errores).toEqual([
        'itemQ no coincide con la circunferencia braquial del control vinculado: CB 21.4 ⇒ 21 ⇒ itemQ 0.5',
      ]);
      expect(resolverItemQ(0, 22.5, true).errores).toEqual([
        'itemQ no coincide con la circunferencia braquial del control vinculado: CB 22.5 ⇒ 23 ⇒ itemQ 1',
      ]);
      expect(resolverItemR(1, 30.4, true).errores).toEqual([
        'itemR no coincide con la circunferencia de la pantorrilla del control vinculado: CP 30.4 ⇒ 30 ⇒ itemR 0',
      ]);
    });

    it('con mismatch igualmente devuelve el valor derivado (para informar)', () => {
      expect(resolverItemQ(0, 25, true).item).toMatchObject({ valor: 1, origen: 'control', soloLectura: true });
    });
  });

  describe('control SIN la medida (opcional) o sin vínculo ⇒ manual', () => {
    it('control que no trae la medida: manual, no solo lectura, con el motivo; sin error aunque falte', () => {
      expect(resolverItemQ(undefined, null, true)).toEqual({
        item: { valor: null, origen: 'manual', soloLectura: false, motivo: 'El control vinculado no trae circunferenciaBraquial: el ítem se registra a mano' },
        errores: [],
      });
      expect(resolverItemR(undefined, undefined, true).item.motivo).toBe('El control vinculado no trae circunferenciaPantorrilla: el ítem se registra a mano');
    });

    it('control sin la medida: el valor manual enviado se conserva (cualquiera de la tabla, sin comparar)', () => {
      expect(resolverItemQ(0.5, null, true).item).toMatchObject({ valor: 0.5, origen: 'manual', soloLectura: false });
      expect(resolverItemR(1, null, true).errores).toEqual([]);
    });

    it('sin vínculo: manual con el motivo «sin vínculo»', () => {
      expect(resolverItemQ(undefined, undefined, false)).toEqual({
        item: { valor: null, origen: 'manual', soloLectura: false, motivo: MOTIVO_SIN_VINCULO },
        errores: [],
      });
      expect(resolverItemR(1, undefined, false).item).toMatchObject({ valor: 1, origen: 'manual' });
    });
  });
});
