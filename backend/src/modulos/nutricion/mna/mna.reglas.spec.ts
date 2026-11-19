import { CAMPOS_EVALUACION } from './mna-v1.instrumento';
import { ControlParaVincular, erroresDeControlVinculado, erroresDeSegundaParte, estadoSegundaParte, puntosItemFPorImc, resolverItemF } from './mna.reglas';

describe('puntosItemFPorImc (ítem F, Tabla 26)', () => {
  it.each([
    [10, 0],
    [18.9, 0],
    [19.0, 1],
    [20.9, 1],
    [21.0, 2],
    [22.9, 2],
    [23.0, 3],
    [25.3, 3],
    [40, 3],
  ])('IMC %p ⇒ itemF %p', (imc, puntos) => {
    expect(puntosItemFPorImc(imc)).toBe(puntos);
  });
});

describe('resolverItemF', () => {
  describe('CON control vinculado (imc 25,3 ⇒ 3)', () => {
    it('omitido o null ⇒ se deriva del IMC', () => {
      expect(resolverItemF(undefined, 25.3)).toEqual({ itemF: 3, errores: [] });
      expect(resolverItemF(null, 25.3)).toEqual({ itemF: 3, errores: [] });
    });

    it('manual IGUAL al derivado ⇒ se acepta', () => {
      expect(resolverItemF(3, 25.3)).toEqual({ itemF: 3, errores: [] });
    });

    it('manual DISTINTO ⇒ se rechaza con el valor que corresponde', () => {
      expect(resolverItemF(1, 25.3)).toEqual({
        itemF: 3,
        errores: ['itemF no coincide con el IMC del control vinculado: IMC 25.3 ⇒ itemF 3'],
      });
    });

    it('un 0 manual (válido) también se compara: IMC 19 ⇒ 1, manual 0 ⇒ rechazo', () => {
      expect(resolverItemF(0, 19.0).errores).toHaveLength(1);
      expect(resolverItemF(0, 18.9).errores).toEqual([]);
    });
  });

  describe('SIN vínculo', () => {
    it('manual obligatorio', () => {
      expect(resolverItemF(undefined, null).errores).toEqual(['itemF es obligatorio cuando no se vincula un control nutricional']);
      expect(resolverItemF(null, null).errores).toHaveLength(1);
    });

    it.each([0, 1, 2, 3])('manual %p ⇒ se toma tal cual', (v) => {
      expect(resolverItemF(v, null)).toEqual({ itemF: v, errores: [] });
    });
  });
});

describe('erroresDeSegundaParte (RF-NU-03 / RN-07)', () => {
  const todos = Object.fromEntries(CAMPOS_EVALUACION.map((c) => [c, 1]));
  const parcial = { itemG: 1, itemH: 1 };

  it('segunda parte completa ⇒ siempre válida (cribaje bajo o alto)', () => {
    expect(erroresDeSegundaParte(todos, 5)).toEqual([]);
    expect(erroresDeSegundaParte(todos, 13)).toEqual([]);
  });

  it('cribaje < 12 y segunda parte omitida ⇒ obligatoria: lista los doce ítems', () => {
    const e = erroresDeSegundaParte({}, 9);
    expect(e).toHaveLength(1);
    expect(e[0]).toContain('obligatoria cuando el subtotal de cribaje es menor que 12 (subtotal 9)');
    expect(e[0]).toContain('faltan itemG, itemH, itemI, itemJ, itemK, itemL, itemM, itemN, itemO, itemP, itemQ, itemR');
  });

  it('cribaje < 12 y segunda parte incompleta ⇒ lista solo los que faltan', () => {
    const e = erroresDeSegundaParte(parcial, 11);
    expect(e[0]).toContain('faltan itemI, itemJ');
    expect(e[0]).not.toContain('itemG,');
  });

  it('FRONTERA: con cribaje 11 es obligatoria; con 12 es opcional', () => {
    expect(erroresDeSegundaParte({}, 11)).toHaveLength(1);
    expect(erroresDeSegundaParte({}, 12)).toEqual([]);
  });

  it('cribaje ≥ 12 y segunda parte omitida (ausente o null) ⇒ válido', () => {
    expect(erroresDeSegundaParte({}, 12)).toEqual([]);
    expect(erroresDeSegundaParte(Object.fromEntries(CAMPOS_EVALUACION.map((c) => [c, null])), 14)).toEqual([]);
  });

  it('cribaje ≥ 12 y segunda parte a medias ⇒ se rechaza (todo o nada)', () => {
    const e = erroresDeSegundaParte(parcial, 13);
    expect(e).toHaveLength(1);
    expect(e[0]).toContain('se envía completa o no se envía');
    expect(e[0]).toContain('faltan itemI');
  });
});

describe('erroresDeControlVinculado', () => {
  const control: ControlParaVincular = { id: 7, expedienteId: 1, anulado: false, fecha: '2026-10-01', imc: 25.3 };
  const ctx = { controlId: 7, expedienteId: 1, fechaEvaluacion: '2026-10-21' };

  it('control válido ⇒ sin errores', () => {
    expect(erroresDeControlVinculado(control, ctx)).toEqual([]);
  });

  it('el control puede ser del mismo día de la evaluación', () => {
    expect(erroresDeControlVinculado({ ...control, fecha: '2026-10-21' }, ctx)).toEqual([]);
  });

  it('inexistente', () => {
    expect(erroresDeControlVinculado(null, ctx)).toEqual(['controlNutricionalId 7 no existe']);
  });

  it('de OTRO expediente', () => {
    expect(erroresDeControlVinculado({ ...control, expedienteId: 2 }, ctx)).toEqual(['controlNutricionalId 7 no pertenece a este expediente']);
  });

  it('anulado', () => {
    expect(erroresDeControlVinculado({ ...control, anulado: true }, ctx)).toEqual(['controlNutricionalId 7 está anulado']);
  });

  it('posterior a la fecha de la evaluación', () => {
    expect(erroresDeControlVinculado({ ...control, fecha: '2026-10-22' }, ctx)).toEqual([
      'controlNutricionalId 7 es del 2026-10-22, posterior a la fecha de la evaluación (2026-10-21)',
    ]);
  });
});

describe('estadoSegundaParte (lo que informa la vista previa; no rechaza nada)', () => {
  const completa = Object.fromEntries(CAMPOS_EVALUACION.map((c) => [c, 0]));

  it('cribaje < 12 sin G–R ⇒ requerida, incompleta, doce faltantes', () => {
    expect(estadoSegundaParte({}, 9)).toEqual({ requerida: true, completa: false, itemsFaltantes: [...CAMPOS_EVALUACION] });
  });

  it('cribaje ≥ 12 sin G–R ⇒ no requerida, incompleta', () => {
    expect(estadoSegundaParte({}, 12)).toMatchObject({ requerida: false, completa: false });
  });

  it('frontera 11 / 12 para «requerida»', () => {
    expect(estadoSegundaParte({}, 11.0).requerida).toBe(true);
    expect(estadoSegundaParte({}, 12).requerida).toBe(false);
  });

  it('a medias ⇒ lista solo los faltantes (ausente o null) en el orden del instrumento', () => {
    expect(estadoSegundaParte({ itemG: 1, itemH: null, itemR: 0 }, 13)).toEqual({
      requerida: false,
      completa: false,
      itemsFaltantes: CAMPOS_EVALUACION.filter((c) => c !== 'itemG' && c !== 'itemR'),
    });
  });

  it('completa ⇒ sin faltantes (también con ceros)', () => {
    expect(estadoSegundaParte(completa, 5)).toEqual({ requerida: true, completa: true, itemsFaltantes: [] });
  });

  it('coincide con erroresDeSegundaParte: hay errores solo si (requerida y falta algo) o (a medias)', () => {
    for (const sub of [0, 11.5, 12, 14]) {
      for (const cant of [0, 1, 11, 12]) {
        const items = Object.fromEntries(CAMPOS_EVALUACION.slice(0, cant).map((c) => [c, 0]));
        const e = estadoSegundaParte(items, sub);
        const hayError = erroresDeSegundaParte(items, sub).length > 0;
        expect(hayError).toBe(!e.completa && (e.requerida || e.itemsFaltantes.length < CAMPOS_EVALUACION.length));
      }
    }
  });
});
