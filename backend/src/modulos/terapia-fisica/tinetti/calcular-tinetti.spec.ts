import { interpretarTinetti } from 'src/common/utils/interpretarTinetti';
import { maximoDeItem, maximoDeItems, puntosPermitidos } from 'src/common/valoraciones/instrumento';
import { calcularTinetti } from './calcular-tinetti';
import {
  ITEMS_EQUILIBRIO_TINETTI_V1,
  ITEMS_MARCHA_TINETTI_V1,
  ITEMS_TINETTI_V1,
  ItemsTinetti,
  MAXIMO_EQUILIBRIO,
  MAXIMO_MARCHA,
  MAXIMO_TINETTI,
  TINETTI_V1,
  VERSION_TINETTI,
} from './tinetti-v1.instrumento';

const CERO = Object.fromEntries(ITEMS_TINETTI_V1.map((i) => [i.campo, 0])) as ItemsTinetti;
const maximoDe = (items: readonly { campo: string; opciones: readonly { puntos: number }[] }[]) =>
  Object.fromEntries(items.map((i) => [i.campo, Math.max(...i.opciones.map((o) => o.puntos))]));
const MAX_EQ = maximoDe(ITEMS_EQUILIBRIO_TINETTI_V1);
const MAX_MA = maximoDe(ITEMS_MARCHA_TINETTI_V1);
const MAXIMO = { ...MAX_EQ, ...MAX_MA } as ItemsTinetti;
const con = (base: ItemsTinetti, cambios: Partial<ItemsTinetti>): ItemsTinetti => ({ ...base, ...cambios });

/** Conjunto de ítems reales que suma exactamente `total` (reparte puntos de ítem en ítem, de equilibrio a marcha). */
const itemsQueSuman = (total: number): ItemsTinetti => {
  const items = { ...CERO };
  let falta = total;
  for (const item of ITEMS_TINETTI_V1) {
    const max = maximoDeItem(item);
    const toma = Math.min(max, falta);
    items[item.campo] = toma;
    falta -= toma;
  }
  if (falta !== 0) throw new Error(`no se puede sumar ${total}`);
  return items;
};

/** Tabla confirmada del 28/09/2026, escrita aparte para contrastar. */
const riesgoEsperado = (t: number): string => (t < 19 ? 'Riesgo alto de caídas' : t <= 23 ? 'Riesgo de caídas' : 'Riesgo bajo o leve');

describe('Tinetti-v1: la tabla del instrumento (Anexo B, Tablas 21 y 22)', () => {
  it('versión y máximos: equilibrio 16, marcha 12, total 28 (RN-06)', () => {
    expect(VERSION_TINETTI).toBe('Tinetti-v1');
    expect(TINETTI_V1.version).toBe('Tinetti-v1');
    expect(ITEMS_EQUILIBRIO_TINETTI_V1).toHaveLength(10);
    expect(ITEMS_MARCHA_TINETTI_V1).toHaveLength(10);
    expect(MAXIMO_EQUILIBRIO).toBe(16);
    expect(MAXIMO_MARCHA).toBe(12);
    expect(MAXIMO_TINETTI).toBe(28);
    expect(maximoDeItems(ITEMS_TINETTI_V1)).toBe(28);
  });

  it('los veinte campos son distintos y siguen el orden del anexo', () => {
    const campos = ITEMS_TINETTI_V1.map((i) => i.campo);
    expect(new Set(campos).size).toBe(20);
    expect(ITEMS_EQUILIBRIO_TINETTI_V1.map((i) => i.campo)).toEqual([
      'equilibrioSentado', 'levantarse', 'intentosLevantarse', 'equilibrioInmediato', 'equilibrioEnPie',
      'empujon', 'ojosCerrados', 'giro360Continuidad', 'giro360Estabilidad', 'sentarse',
    ]);
    expect(ITEMS_MARCHA_TINETTI_V1.map((i) => i.campo)).toEqual([
      'inicioMarcha', 'longitudPasoDerecho', 'alturaPasoDerecho', 'longitudPasoIzquierdo', 'alturaPasoIzquierdo',
      'simetriaPaso', 'continuidadPasos', 'trayectoria', 'tronco', 'posturaMarcha',
    ]);
  });

  it('cada ítem admite SOLO los puntos del anexo', () => {
    const permitidos = Object.fromEntries(ITEMS_TINETTI_V1.map((i) => [i.campo, puntosPermitidos(i)]));
    expect(permitidos).toEqual({
      equilibrioSentado: [0, 1], levantarse: [0, 1, 2], intentosLevantarse: [0, 1, 2], equilibrioInmediato: [0, 1, 2],
      equilibrioEnPie: [0, 1, 2], empujon: [0, 1, 2], ojosCerrados: [0, 1], giro360Continuidad: [0, 1],
      giro360Estabilidad: [0, 1], sentarse: [0, 1, 2],
      inicioMarcha: [0, 1], longitudPasoDerecho: [0, 1], alturaPasoDerecho: [0, 1], longitudPasoIzquierdo: [0, 1],
      alturaPasoIzquierdo: [0, 1], simetriaPaso: [0, 1], continuidadPasos: [0, 1], trayectoria: [0, 1, 2],
      tronco: [0, 1, 2], posturaMarcha: [0, 1],
    });
  });

  it('opciones en orden ascendente (como el anexo), sin repetir, con etiqueta no vacía', () => {
    for (const item of ITEMS_TINETTI_V1) {
      const puntos = puntosPermitidos(item);
      expect([...puntos].sort((a, b) => a - b)).toEqual(puntos);
      expect(new Set(puntos).size).toBe(puntos.length);
      for (const o of item.opciones) expect(o.etiqueta.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('calcularTinetti (RF-TF-09 / RN-06)', () => {
  // [descripción, ítems, equilibrio, marcha, total, riesgo]
  const casos: [string, ItemsTinetti, number, number, number, string][] = [
    ['MÍNIMO: todo en 0', CERO, 0, 0, 0, 'Riesgo alto de caídas'],
    ['equilibrio máximo (16) con marcha en 0', { ...CERO, ...MAX_EQ }, 16, 0, 16, 'Riesgo alto de caídas'],
    ['marcha máxima (12) con equilibrio en 0', { ...CERO, ...MAX_MA }, 0, 12, 12, 'Riesgo alto de caídas'],
    ['18: último valor de «Riesgo alto»', itemsQueSuman(18), 16, 2, 18, 'Riesgo alto de caídas'],
    ['19: primer valor de «Riesgo de caídas»', itemsQueSuman(19), 16, 3, 19, 'Riesgo de caídas'],
    ['23: último valor de «Riesgo de caídas»', itemsQueSuman(23), 16, 7, 23, 'Riesgo de caídas'],
    ['24: primer valor de «Riesgo bajo o leve»', itemsQueSuman(24), 16, 8, 24, 'Riesgo bajo o leve'],
    ['MÁXIMO: 28', MAXIMO, 16, 12, 28, 'Riesgo bajo o leve'],
    ['27 (un ítem de marcha en 0)', con(MAXIMO, { posturaMarcha: 0 }), 16, 11, 27, 'Riesgo bajo o leve'],
  ];

  it.each(casos)('%s', (_d, items, eq, ma, total, riesgo) => {
    expect(calcularTinetti(items)).toEqual({ puntajeEquilibrio: eq, puntajeMarcha: ma, puntajeTotal: total, riesgoCaida: riesgo });
  });

  it('CA-09: ninguno de los tres totales puede exceder su máximo y el total es la suma de los dos', () => {
    const r = calcularTinetti(MAXIMO);
    expect(r.puntajeEquilibrio).toBeLessThanOrEqual(16);
    expect(r.puntajeMarcha).toBeLessThanOrEqual(12);
    expect(r.puntajeTotal).toBe(r.puntajeEquilibrio + r.puntajeMarcha);
    expect(r.puntajeTotal).toBeLessThanOrEqual(28);
  });

  it('TODOS los totales de 0 a 28 son alcanzables y el riesgo coincide con la tabla en cada uno', () => {
    for (let t = 0; t <= 28; t++) {
      const r = calcularTinetti(itemsQueSuman(t));
      expect(r.puntajeTotal).toBe(t);
      expect(r.riesgoCaida).toBe(riesgoEsperado(t));
    }
  });

  it('EXHAUSTIVO por parte: las 11 664 combinaciones de equilibrio y las 2 304 de marcha suman bien y respetan su máximo', () => {
    const recorrer = (items: readonly { campo: string; opciones: readonly { puntos: number }[] }[], maximo: number) => {
      let n = 0;
      const dentro = (i: number, suma: number, parcial: Record<string, number>): void => {
        if (i === items.length) {
          n++;
          const r = calcularTinetti({ ...CERO, ...parcial } as ItemsTinetti);
          const eq = items === ITEMS_EQUILIBRIO_TINETTI_V1 ? r.puntajeEquilibrio : r.puntajeMarcha;
          const otro = items === ITEMS_EQUILIBRIO_TINETTI_V1 ? r.puntajeMarcha : r.puntajeEquilibrio;
          if (eq !== suma || otro !== 0 || suma > maximo || r.riesgoCaida !== riesgoEsperado(suma)) {
            throw new Error(`Combinación incorrecta ${JSON.stringify(parcial)} → ${JSON.stringify(r)}`);
          }
          return;
        }
        for (const o of items[i].opciones) dentro(i + 1, suma + o.puntos, { ...parcial, [items[i].campo]: o.puntos });
      };
      dentro(0, 0, {});
      return n;
    };
    expect(recorrer(ITEMS_EQUILIBRIO_TINETTI_V1, 16)).toBe(11664);
    expect(recorrer(ITEMS_MARCHA_TINETTI_V1, 12)).toBe(2304);
  });

  it('no modifica los ítems recibidos', () => {
    const entrada = { ...MAXIMO };
    calcularTinetti(entrada);
    expect(entrada).toEqual(MAXIMO);
  });

  describe('rechaza ítems que no son una opción del instrumento (RangeError)', () => {
    it.each([
      ['equilibrioSentado', 2],
      ['levantarse', 3],
      ['ojosCerrados', 2],
      ['sentarse', 3],
      ['inicioMarcha', 2],
      ['trayectoria', 3],
      ['tronco', -1],
      ['posturaMarcha', 2],
      ['empujon', 1.5],
    ])('%s = %p', (campo, valor) => {
      expect(() => calcularTinetti(con(MAXIMO, { [campo]: valor }))).toThrow(RangeError);
    });

    it('ítem ausente', () => {
      const incompleto: Partial<ItemsTinetti> = { ...MAXIMO };
      delete incompleto.posturaMarcha;
      expect(() => calcularTinetti(incompleto as ItemsTinetti)).toThrow(RangeError);
    });
  });
});

describe('interpretarTinetti: fronteras de la tabla confirmada (28/09/2026)', () => {
  it.each([
    [0, 'Riesgo alto de caídas'],
    [18, 'Riesgo alto de caídas'],
    [19, 'Riesgo de caídas'],
    [23, 'Riesgo de caídas'],
    [24, 'Riesgo bajo o leve'],
    [28, 'Riesgo bajo o leve'],
  ])('total %p ⇒ %s', (total, riesgo) => {
    expect(interpretarTinetti(total)).toBe(riesgo);
  });
});
