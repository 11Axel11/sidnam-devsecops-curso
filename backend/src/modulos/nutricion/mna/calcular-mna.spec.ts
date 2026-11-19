import { MNA_ITEM_Q_PUNTAJE, MNA_SECCION_EVALUACION_MAXIMO } from 'src/common/constants/mna.constant';
import { maximoDeItem, maximoDeItems, puntosPermitidos } from 'src/common/valoraciones/instrumento';
import { calcularMna, interpretarCribaje, interpretarGlobal, ItemsMna } from './calcular-mna';
import {
  CAMPOS_EVALUACION,
  ITEMS_CRIBAJE_MNA_V1,
  ITEMS_EVALUACION_MNA_V1,
  ITEMS_MNA_V1,
  MAXIMO_CRIBAJE,
  MAXIMO_EVALUACION,
  MAXIMO_GLOBAL,
  MNA_V1,
  VERSION_MNA,
} from './mna-v1.instrumento';

type Cribaje = Pick<ItemsMna, 'itemA' | 'itemB' | 'itemC' | 'itemD' | 'itemE' | 'itemF'>;

/** Busca (con retroceso) una combinación de opciones reales que sume exactamente `total`. */
const repartir = (items: readonly { campo: string; opciones: readonly { puntos: number }[] }[], total: number): Record<string, number> => {
  const buscar = (i: number, falta: number): Record<string, number> | null => {
    if (i === items.length) return falta === 0 ? {} : null;
    const opciones = [...items[i].opciones].map((o) => o.puntos).sort((a, b) => b - a);
    for (const p of opciones) {
      if (p > falta) continue;
      const resto = buscar(i + 1, falta - p);
      if (resto) return { [items[i].campo]: p, ...resto };
    }
    return null;
  };
  const r = buscar(0, total);
  if (!r) throw new Error(`no se puede sumar ${total}`);
  return r;
};
const cribaje = (total: number) => repartir(ITEMS_CRIBAJE_MNA_V1, total) as unknown as Cribaje;
const evaluacion = (total: number) => repartir(ITEMS_EVALUACION_MNA_V1, total) as Partial<ItemsMna>;
const completo = (subCribaje: number, subEvaluacion: number): ItemsMna => ({ ...cribaje(subCribaje), ...evaluacion(subEvaluacion) });

describe('MNA-v1: la tabla del instrumento (Anexo D, Tablas 26 y 28)', () => {
  it('versión y máximos: cribaje 14, evaluación 16, global 30 (RN-07)', () => {
    expect(VERSION_MNA).toBe('MNA-v1');
    expect(MNA_V1.version).toBe('MNA-v1');
    expect(ITEMS_CRIBAJE_MNA_V1).toHaveLength(6);
    expect(ITEMS_EVALUACION_MNA_V1).toHaveLength(12);
    expect(MAXIMO_CRIBAJE).toBe(14);
    expect(MAXIMO_EVALUACION).toBe(16);
    expect(MAXIMO_GLOBAL).toBe(30);
  });

  it('ÍTEM Q = 1,0 (decisión P2): la suma de los máximos de G–R es exactamente 16; con 2,0 serían 17', () => {
    expect(MNA_ITEM_Q_PUNTAJE).toBe(1);
    expect(MNA_SECCION_EVALUACION_MAXIMO).toBe(16);
    expect(maximoDeItems(ITEMS_EVALUACION_MNA_V1)).toBe(MNA_SECCION_EVALUACION_MAXIMO);
    const q = ITEMS_EVALUACION_MNA_V1.find((i) => i.campo === 'itemQ')!;
    expect(maximoDeItem(q)).toBe(1.0);
    expect(q.opciones.find((o) => o.etiqueta === 'CB mayor a 22')?.puntos).toBe(1.0);
    expect(MAXIMO_EVALUACION - maximoDeItem(q) + 2.0).toBe(17); // el valor erróneo rompería el máximo
  });

  it('los campos siguen el orden del anexo: itemA … itemR', () => {
    expect(ITEMS_MNA_V1.map((i) => i.campo)).toEqual('ABCDEFGHIJKLMNOPQR'.split('').map((l) => `item${l}`));
  });

  it('cada ítem admite SOLO los puntos del anexo (K, M, P y Q con medios puntos)', () => {
    const permitidos = Object.fromEntries(ITEMS_MNA_V1.map((i) => [i.campo, puntosPermitidos(i)]));
    expect(permitidos).toEqual({
      itemA: [0, 1, 2], itemB: [0, 1, 2, 3], itemC: [0, 1, 2], itemD: [0, 2], itemE: [0, 1, 2], itemF: [0, 1, 2, 3],
      itemG: [0, 1], itemH: [0, 1], itemI: [0, 1], itemJ: [0, 1, 2], itemK: [0, 0.5, 1], itemL: [0, 1],
      itemM: [0, 0.5, 1], itemN: [0, 1, 2], itemO: [0, 1, 2], itemP: [0, 0.5, 1, 2], itemQ: [0, 0.5, 1], itemR: [0, 1],
    });
  });

  it('opciones en orden ascendente (como el anexo), sin repetir, con etiqueta no vacía', () => {
    for (const item of ITEMS_MNA_V1) {
      const puntos = puntosPermitidos(item);
      expect([...puntos].sort((a, b) => a - b)).toEqual(puntos);
      expect(new Set(puntos).size).toBe(puntos.length);
      for (const o of item.opciones) expect(o.etiqueta.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('interpretarCribaje (Tabla 27)', () => {
  it.each([
    [0, 'Malnutrición. Continuar la evaluación.'],
    [7, 'Malnutrición. Continuar la evaluación.'],
    [8, 'Riesgo de malnutrición. Continuar la evaluación.'],
    [11, 'Riesgo de malnutrición. Continuar la evaluación.'],
    [12, 'Estado nutricional normal. No es necesario continuar la evaluación.'],
    [14, 'Estado nutricional normal. No es necesario continuar la evaluación.'],
  ])('subtotal %p ⇒ %s', (sub, texto) => {
    expect(interpretarCribaje(sub)).toBe(texto);
  });
});

describe('interpretarGlobal (Tabla 30)', () => {
  it.each([
    [0, 'Malnutrición'],
    [16.5, 'Malnutrición'],
    [16.9, 'Malnutrición'],
    [17, 'Riesgo de malnutrición'],
    [21.5, 'Riesgo de malnutrición'],
    [23.5, 'Riesgo de malnutrición'],
    [24, 'Estado nutricional normal'],
    [30, 'Estado nutricional normal'],
  ])('global %p ⇒ %s', (global, texto) => {
    expect(interpretarGlobal(global)).toBe(texto);
  });
});

describe('calcularMna (RF-NU-03 / RN-07)', () => {
  it('MÍNIMO: todo en 0 ⇒ cribaje 0, evaluación 0, global 0 y «Malnutrición» en ambas tablas', () => {
    const r = calcularMna(completo(0, 0));
    expect(r).toEqual({
      subtotalCribaje: 0,
      interpretacionCribaje: 'Malnutrición. Continuar la evaluación.',
      subtotalEvaluacion: 0,
      evaluacionGlobal: 0,
      interpretacionGlobal: 'Malnutrición',
    });
  });

  it('MÁXIMO: 14 + 16 = 30 ⇒ normal en ambas tablas', () => {
    const r = calcularMna(completo(14, 16));
    expect(r).toEqual({
      subtotalCribaje: 14,
      interpretacionCribaje: 'Estado nutricional normal. No es necesario continuar la evaluación.',
      subtotalEvaluacion: 16,
      evaluacionGlobal: 30,
      interpretacionGlobal: 'Estado nutricional normal',
    });
  });

  it('CA-16: cribaje 9 (riesgo) y evaluación 12,5 ⇒ global 21,5 «Riesgo de malnutrición»', () => {
    const r = calcularMna(completo(9, 12.5));
    expect(r).toMatchObject({ subtotalCribaje: 9, interpretacionCribaje: 'Riesgo de malnutrición. Continuar la evaluación.', subtotalEvaluacion: 12.5, evaluacionGlobal: 21.5, interpretacionGlobal: 'Riesgo de malnutrición' });
  });

  describe('fronteras del cribaje con ítems reales (la segunda parte se omite)', () => {
    it.each([
      [0, 'Malnutrición. Continuar la evaluación.'],
      [7, 'Malnutrición. Continuar la evaluación.'],
      [8, 'Riesgo de malnutrición. Continuar la evaluación.'],
      [11, 'Riesgo de malnutrición. Continuar la evaluación.'],
      [12, 'Estado nutricional normal. No es necesario continuar la evaluación.'],
      [14, 'Estado nutricional normal. No es necesario continuar la evaluación.'],
    ])('cribaje %p', (sub, texto) => {
      expect(calcularMna(cribaje(sub))).toEqual({
        subtotalCribaje: sub,
        interpretacionCribaje: texto,
        subtotalEvaluacion: null,
        evaluacionGlobal: null,
        interpretacionGlobal: null,
      });
    });
  });

  describe('fronteras de la evaluación global con ítems reales (medios puntos)', () => {
    // cribaje 12 + evaluación (4,5 → 16,5 · 5 → 17 · 11,5 → 23,5 · 12 → 24)
    it.each([
      [4.5, 16.5, 'Malnutrición'],
      [5, 17, 'Riesgo de malnutrición'],
      [11.5, 23.5, 'Riesgo de malnutrición'],
      [12, 24, 'Estado nutricional normal'],
    ])('evaluación %p ⇒ global %p ⇒ %s', (ev, global, texto) => {
      expect(calcularMna(completo(12, ev))).toMatchObject({ subtotalEvaluacion: ev, evaluacionGlobal: global, interpretacionGlobal: texto });
    });
  });

  it('todos los subtotales de evaluación de 0 a 16 en pasos de 0,5 son alcanzables y suman exacto', () => {
    for (let ev = 0; ev <= 16; ev += 0.5) {
      const r = calcularMna(completo(5, ev));
      expect(r.subtotalEvaluacion).toBe(ev);
      expect(r.evaluacionGlobal).toBe(5 + ev);
    }
  });

  it('la segunda parte puede omitirse con cribaje ≥ 12 (los tres valores de evaluación quedan en null); null cuenta como ausente', () => {
    const conNulls = { ...cribaje(13), ...Object.fromEntries(CAMPOS_EVALUACION.map((c) => [c, null])) } as ItemsMna;
    expect(calcularMna(conNulls)).toMatchObject({ subtotalCribaje: 13, subtotalEvaluacion: null, evaluacionGlobal: null, interpretacionGlobal: null });
  });

  it('EXHAUSTIVO del cribaje: las 864 combinaciones suman y se interpretan según la Tabla 27', () => {
    let n = 0;
    const dentro = (i: number, suma: number, actual: Record<string, number>): void => {
      if (i === ITEMS_CRIBAJE_MNA_V1.length) {
        n++;
        const r = calcularMna(actual as unknown as ItemsMna);
        const esperado = suma >= 12 ? 'normal' : suma >= 8 ? 'riesgo' : 'malnutrición';
        if (r.subtotalCribaje !== suma || !r.interpretacionCribaje.toLowerCase().startsWith(esperado === 'normal' ? 'estado nutricional normal' : esperado === 'riesgo' ? 'riesgo' : 'malnutrición')) {
          throw new Error(`Combinación incorrecta ${JSON.stringify(actual)} → ${JSON.stringify(r)}`);
        }
        return;
      }
      for (const o of ITEMS_CRIBAJE_MNA_V1[i].opciones) dentro(i + 1, suma + o.puntos, { ...actual, [ITEMS_CRIBAJE_MNA_V1[i].campo]: o.puntos });
    };
    dentro(0, 0, {});
    expect(n).toBe(864);
  });

  it('EXHAUSTIVO de la evaluación: las 93 312 combinaciones suman exacto, nunca pasan de 16 y la global se interpreta según la Tabla 30', () => {
    const base = cribaje(12) as unknown as Record<string, number>;
    let n = 0;
    let maximo = 0;
    const dentro = (i: number, suma: number, actual: Record<string, number>): void => {
      if (i === ITEMS_EVALUACION_MNA_V1.length) {
        n++;
        maximo = Math.max(maximo, suma);
        const r = calcularMna({ ...base, ...actual } as unknown as ItemsMna);
        const global = 12 + suma;
        const esperado = global >= 24 ? 'Estado nutricional normal' : global >= 17 ? 'Riesgo de malnutrición' : 'Malnutrición';
        if (r.subtotalEvaluacion !== suma || suma > 16 || r.evaluacionGlobal !== global || r.interpretacionGlobal !== esperado) {
          throw new Error(`Combinación incorrecta ${JSON.stringify(actual)} → ${JSON.stringify(r)}`);
        }
        return;
      }
      for (const o of ITEMS_EVALUACION_MNA_V1[i].opciones) dentro(i + 1, suma + o.puntos, { ...actual, [ITEMS_EVALUACION_MNA_V1[i].campo]: o.puntos });
    };
    dentro(0, 0, {});
    expect(n).toBe(93312);
    expect(maximo).toBe(16);
  });

  it('no modifica los ítems recibidos', () => {
    const entrada = completo(9, 12.5);
    const copia = { ...entrada };
    calcularMna(entrada);
    expect(entrada).toEqual(copia);
  });

  describe('rechaza ítems que no son una opción del instrumento (RangeError)', () => {
    it.each([
      ['itemA', 3],
      ['itemB', 4],
      ['itemC', 3],
      ['itemD', 1],
      ['itemF', 4],
      ['itemG', 2],
      ['itemK', 0.3],
      ['itemK', 2],
      ['itemM', 1.5],
      ['itemP', 3],
      ['itemP', 1.5],
      ['itemQ', 2], // el valor erróneo de la hoja física (decisión P2)
      ['itemR', 0.5],
      ['itemJ', -1],
    ])('%s = %p', (campo, valor) => {
      expect(() => calcularMna({ ...completo(9, 12.5), [campo]: valor })).toThrow(RangeError);
    });

    it('falta un ítem del cribaje (A–F)', () => {
      const incompleto: Partial<ItemsMna> = { ...completo(9, 12.5) };
      delete incompleto.itemE;
      expect(() => calcularMna(incompleto as ItemsMna)).toThrow(RangeError);
    });

    it('segunda parte INCOMPLETA (falta un ítem de G–R)', () => {
      const incompleto: Partial<ItemsMna> = { ...completo(9, 12.5) };
      delete incompleto.itemR;
      expect(() => calcularMna(incompleto as ItemsMna)).toThrow(/faltan itemR/);
    });
  });
});
