import { interpretarBarthel } from 'src/common/utils/interpretarBarthel';
import { maximoDeItems, puntosPermitidos } from 'src/common/valoraciones/instrumento';
import { BARTHEL_V1, DEAMBULAR_SILLA_DE_RUEDAS, ITEMS_BARTHEL_V1, ItemsBarthel, MAXIMO_BARTHEL, VERSION_BARTHEL } from './barthel-v1.instrumento';
import { calcularBarthel } from './calcular-barthel';

const CERO: ItemsBarthel = {
  comer: 0,
  lavarse: 0,
  vestirse: 0,
  arreglarse: 0,
  deposiciones: 0,
  miccion: 0,
  usarRetrete: 0,
  trasladarse: 0,
  deambular: 0,
  escalones: 0,
};
const MAXIMO: ItemsBarthel = {
  comer: 10,
  lavarse: 5,
  vestirse: 10,
  arreglarse: 5,
  deposiciones: 10,
  miccion: 10,
  usarRetrete: 10,
  trasladarse: 15,
  deambular: 15,
  escalones: 10,
};
const con = (base: ItemsBarthel, cambios: Partial<ItemsBarthel>): ItemsBarthel => ({ ...base, ...cambios });

/** Tabla confirmada del 28/09/2026, escrita aparte para contrastar (no reutiliza el código bajo prueba). */
const gradoEsperado = (total: number, silla: boolean): string => {
  if (total === 90 && silla) return 'Independencia — uso de silla de ruedas';
  if (total === 100) return 'Independencia';
  if (total >= 91) return 'Dependencia Escasa';
  if (total >= 61) return 'Dependencia Moderada';
  if (total >= 21) return 'Dependencia Severa';
  return 'Dependencia Total';
};

describe('Barthel-v1: la tabla del instrumento (Anexo A, Tabla 18)', () => {
  it('versión y máximos: 10 ítems, 100 puntos', () => {
    expect(VERSION_BARTHEL).toBe('Barthel-v1');
    expect(BARTHEL_V1.version).toBe('Barthel-v1');
    expect(ITEMS_BARTHEL_V1).toHaveLength(10);
    expect(MAXIMO_BARTHEL).toBe(100);
    expect(maximoDeItems(ITEMS_BARTHEL_V1)).toBe(100);
  });

  it('el orden de los ítems es el del anexo y el de RF-TF-08', () => {
    expect(ITEMS_BARTHEL_V1.map((i) => i.campo)).toEqual([
      'comer', 'lavarse', 'vestirse', 'arreglarse', 'deposiciones', 'miccion', 'usarRetrete', 'trasladarse', 'deambular', 'escalones',
    ]);
  });

  it('cada ítem admite SOLO los valores discretos del anexo (no cualquier entero de un rango)', () => {
    const permitidos = Object.fromEntries(ITEMS_BARTHEL_V1.map((i) => [i.campo, puntosPermitidos(i)]));
    expect(permitidos).toEqual({
      comer: [10, 5, 0],
      lavarse: [5, 0],
      vestirse: [10, 5, 0],
      arreglarse: [5, 0],
      deposiciones: [10, 5, 0],
      miccion: [10, 5, 0],
      usarRetrete: [10, 5, 0],
      trasladarse: [15, 10, 5, 0],
      deambular: [15, 10, 5, 0],
      escalones: [10, 5, 0],
    });
  });

  it('opciones sin puntos repetidos, en orden descendente y con etiqueta no vacía', () => {
    for (const item of ITEMS_BARTHEL_V1) {
      const puntos = puntosPermitidos(item);
      expect(new Set(puntos).size).toBe(puntos.length);
      expect([...puntos].sort((a, b) => b - a)).toEqual(puntos);
      for (const o of item.opciones) expect(o.etiqueta.trim().length).toBeGreaterThan(0);
    }
  });

  it('«Deambular» = 5 es «Independiente en silla de ruedas sin ayuda» (de ahí sale la regla)', () => {
    const deambular = ITEMS_BARTHEL_V1.find((i) => i.campo === 'deambular');
    expect(deambular?.opciones.find((o) => o.puntos === DEAMBULAR_SILLA_DE_RUEDAS)?.etiqueta).toBe('Independiente en silla de ruedas sin ayuda');
  });

  it('con silla de ruedas el máximo alcanzable es 90 (Anexo A: «90 puntos si se desplaza en silla de ruedas»)', () => {
    expect(calcularBarthel(con(MAXIMO, { deambular: 5 })).puntajeTotal).toBe(90);
  });
});

describe('calcularBarthel (RF-TF-08 / RN-05)', () => {
  // [descripción, ítems, total, grado]
  const casos: [string, ItemsBarthel, number, string][] = [
    ['MÍNIMO: todo dependiente', CERO, 0, 'Dependencia Total'],
    ['frontera superior de «Total» (20)', con(CERO, { comer: 10, usarRetrete: 10 }), 20, 'Dependencia Total'],
    ['primer valor alcanzable sobre 20 (25)', con(CERO, { comer: 10, usarRetrete: 10, lavarse: 5 }), 25, 'Dependencia Severa'],
    ['CA-08: suma 45 (con la tabla vigente es «Severa», no «Moderado»)', con(CERO, { comer: 10, vestirse: 10, deposiciones: 10, miccion: 10, arreglarse: 5 }), 45, 'Dependencia Severa'],
    ['frontera superior de «Severa» (60)', con(CERO, { trasladarse: 15, comer: 10, vestirse: 10, deposiciones: 10, miccion: 10, arreglarse: 5 }), 60, 'Dependencia Severa'],
    ['primer valor alcanzable sobre 60 (65)', con(CERO, { trasladarse: 15, comer: 10, vestirse: 10, deposiciones: 10, miccion: 10, arreglarse: 5, lavarse: 5 }), 65, 'Dependencia Moderada'],
    ['85 con silla de ruedas: la regla NO aplica (el total no es 90)', con(MAXIMO, { deambular: 5, lavarse: 0 }), 85, 'Dependencia Moderada'],
    ['90 SIN silla de ruedas: «Moderada» (frontera superior de 61–90)', con(MAXIMO, { escalones: 0 }), 90, 'Dependencia Moderada'],
    ['90 CON silla de ruedas (deambular = 5): precedencia sobre 61–90', con(MAXIMO, { deambular: 5 }), 90, 'Independencia — uso de silla de ruedas'],
    ['95 (primer valor alcanzable sobre 90)', con(MAXIMO, { escalones: 5 }), 95, 'Dependencia Escasa'],
    ['MÁXIMO: 100', MAXIMO, 100, 'Independencia'],
    ['silla de ruedas con todo lo demás dependiente (total 5)', con(CERO, { deambular: 5 }), 5, 'Dependencia Total'],
  ];

  it.each(casos)('%s', (_d, items, total, grado) => {
    expect(calcularBarthel(items)).toEqual({ puntajeTotal: total, gradoDependencia: grado });
  });

  it('no modifica los ítems recibidos', () => {
    const entrada = { ...MAXIMO };
    calcularBarthel(entrada);
    expect(entrada).toEqual(MAXIMO);
  });

  it('EXHAUSTIVO: las 46 656 combinaciones de ítems dan la suma y el grado de la tabla confirmada', () => {
    const permitidos = ITEMS_BARTHEL_V1.map((i) => ({ campo: i.campo, puntos: puntosPermitidos(i) }));
    let combinaciones = 0;
    const totalesVistos = new Set<number>();
    const recorrer = (indice: number, actual: Record<string, number>, suma: number) => {
      if (indice === permitidos.length) {
        combinaciones++;
        totalesVistos.add(suma);
        const r = calcularBarthel(actual as ItemsBarthel);
        const silla = actual.deambular === DEAMBULAR_SILLA_DE_RUEDAS;
        if (r.puntajeTotal !== suma || r.gradoDependencia !== gradoEsperado(suma, silla)) {
          throw new Error(`Combinación incorrecta ${JSON.stringify(actual)} → ${JSON.stringify(r)}`);
        }
        return;
      }
      for (const p of permitidos[indice].puntos) recorrer(indice + 1, { ...actual, [permitidos[indice].campo]: p }, suma + p);
    };
    recorrer(0, {}, 0);
    expect(combinaciones).toBe(46656);
    expect(Math.min(...totalesVistos)).toBe(0);
    expect(Math.max(...totalesVistos)).toBe(100);
    // Todo es múltiplo de 5: por eso 21, 61, 91 y 99 solo se prueban en la tabla de interpretación (abajo).
    expect([...totalesVistos].every((t) => t % 5 === 0)).toBe(true);
  });

  describe('rechaza ítems que no son una opción del instrumento (RangeError)', () => {
    it.each([
      ['comer', 7],
      ['comer', 15],
      ['lavarse', 10],
      ['arreglarse', 10],
      ['trasladarse', 20],
      ['deambular', 1],
      ['escalones', 15],
      ['comer', -5],
      ['comer', 5.5],
    ])('%s = %p', (campo, valor) => {
      expect(() => calcularBarthel(con(MAXIMO, { [campo]: valor }))).toThrow(RangeError);
    });

    it('ítem ausente', () => {
      const incompleto: Partial<ItemsBarthel> = { ...MAXIMO };
      delete incompleto.escalones;
      expect(() => calcularBarthel(incompleto as ItemsBarthel)).toThrow(RangeError);
    });
  });
});

describe('interpretarBarthel: fronteras de la tabla confirmada (28/09/2026), sin importar si el total es alcanzable', () => {
  // 21, 61, 91 y 99 no salen de combinaciones de ítems (todo es múltiplo de 5), pero son las fronteras de la tabla.
  it.each([
    [0, 'Dependencia Total'],
    [20, 'Dependencia Total'],
    [21, 'Dependencia Severa'],
    [60, 'Dependencia Severa'],
    [61, 'Dependencia Moderada'],
    [90, 'Dependencia Moderada'],
    [91, 'Dependencia Escasa'],
    [99, 'Dependencia Escasa'],
    [100, 'Independencia'],
  ])('total %p ⇒ %s', (total, grado) => {
    expect(interpretarBarthel(total, false)).toBe(grado);
  });

  it('90 con silla de ruedas ⇒ Independencia — uso de silla de ruedas; con otro total la silla no cambia nada', () => {
    expect(interpretarBarthel(90, true)).toBe('Independencia — uso de silla de ruedas');
    expect(interpretarBarthel(85, true)).toBe('Dependencia Moderada');
    expect(interpretarBarthel(95, true)).toBe('Dependencia Escasa');
  });

  it('cubre 0–100 sin huecos: cada total tiene exactamente un grado de la tabla', () => {
    for (let t = 0; t <= 100; t++) {
      expect(interpretarBarthel(t, false)).toBe(gradoEsperado(t, false));
    }
  });
});
