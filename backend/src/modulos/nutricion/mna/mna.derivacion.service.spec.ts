/* eslint-disable @typescript-eslint/no-unsafe-argument -- base simulada en memoria */
import { BadRequestException } from '@nestjs/common';
import { crearDbSimulada } from 'src/modulos/terapia-fisica/valoraciones/testing/db-simulada';
import { ControlNutricional } from '../entities/control-nutricional.entity';
import { EvaluacionMna } from '../entities/evaluacion-mna.entity';
import { CrearEvaluacionMnaDto } from './dto/evaluacion-mna.dto';
import { EvaluacionesMnaService } from './evaluaciones-mna.service';
import { MOTIVO_SIN_VINCULO } from './mna.reglas';

/**
 * Ítems Q y R derivados del control vinculado (decisión de la Jefatura, octubre 2026), en el servicio: la vista previa
 * y el registro usan la misma `preparar`. La derivación se INFORMA siempre (`itemsOrigen`) cuando hay control con la
 * medida; GUARDAR Q/R queda condicionado a que se envíe al menos un ítem de la segunda parte.
 */
const USUARIO = 9;
const dto = (parcial: object): CrearEvaluacionMnaDto => parcial as CrearEvaluacionMnaDto;
const G_P_FALTANTES = ['itemG', 'itemH', 'itemI', 'itemJ', 'itemK', 'itemL', 'itemM', 'itemN', 'itemO', 'itemP'];
/** Cribaje de 9 puntos (con itemF 2 ⇒ 9) y de 13 (con itemF 2 ⇒ 13). */
const CRIBAJE_9 = { itemA: 1, itemB: 2, itemC: 1, itemD: 2, itemE: 1 };
const CRIBAJE_13 = { itemA: 2, itemB: 3, itemC: 2, itemD: 2, itemE: 2 };
/** G–P completos (los diez ítems que se capturan siempre a mano): suman 14 con todo al máximo. */
const G_P_MAX = { itemG: 1, itemH: 1, itemI: 1, itemJ: 2, itemK: 1, itemL: 1, itemM: 1, itemN: 2, itemO: 2, itemP: 2 };
const G_P_BAJO = { itemG: 0, itemH: 0, itemI: 0, itemJ: 0, itemK: 0, itemL: 0, itemM: 0, itemN: 0, itemO: 0, itemP: 0 };

const escenario = () => {
  const db = crearDbSimulada([1, 2]);
  const svc = new EvaluacionesMnaService(db.dataSource);
  const filas = () => db.filas(EvaluacionMna) as EvaluacionMna[];
  const control = (parcial: Partial<ControlNutricional> & { id: number }) =>
    db.insertar(ControlNutricional, { expedienteId: 1, fecha: '2026-10-01', imc: 25.3, anulado: false, ...parcial });
  return { db, svc, filas, control };
};

const erroresDe = async (promesa: Promise<unknown>): Promise<string[]> => {
  const e = await promesa.then(
    () => {
      throw new Error('se esperaba un 400');
    },
    (x: unknown) => x,
  );
  expect(e).toBeInstanceOf(BadRequestException);
  return ((e as BadRequestException).getResponse() as { errores: string[] }).errores;
};

describe('MNA — ítems Q y R derivados del control', () => {
  describe('vista previa (itemsOrigen)', () => {
    it('con control que trae CB y CP: Q y R vienen del control, de solo lectura, AUNQUE no se haya enviado ningún ítem de G–P', async () => {
      const { svc, control, filas } = escenario();
      control({ id: 7, imc: 22.4, circunferenciaBraquial: 21.4, circunferenciaPantorrilla: 30.5 });
      const v = await svc.calcular(1, dto({ ...CRIBAJE_9, controlNutricionalId: 7 }));
      expect(v.itemsOrigen).toEqual({
        itemF: { valor: 2, origen: 'control', soloLectura: true, medida: 22.4 },
        itemQ: { valor: 0.5, origen: 'control', soloLectura: true, medida: 21.4, medidaRedondeada: 21 },
        itemR: { valor: 1, origen: 'control', soloLectura: true, medida: 30.5, medidaRedondeada: 31 },
      });
      expect(v.itemF).toBe(2); // el campo plano de siempre se conserva (aditivo)
      expect(v.subtotalEvaluacion).toBeNull();
      expect(filas()).toHaveLength(0);
    });

    it('itemsFaltantes NUNCA lista Q/R cuando se derivan del control: solo G–P', async () => {
      const { svc, control } = escenario();
      control({ id: 7, circunferenciaBraquial: 25, circunferenciaPantorrilla: 35 });
      const v = await svc.calcular(1, dto({ ...CRIBAJE_13, controlNutricionalId: 7 }));
      expect(v.segundaParte).toEqual({ requerida: false, completa: false, itemsFaltantes: G_P_FALTANTES });
    });

    it('control que NO trae la CB: Q se pide a mano (lo indica) y R sigue derivándose; itemsFaltantes lista solo Q (más G–P)', async () => {
      const { svc, control } = escenario();
      control({ id: 7, circunferenciaBraquial: null, circunferenciaPantorrilla: 31 });
      const v = await svc.calcular(1, dto({ ...CRIBAJE_9, controlNutricionalId: 7 }));
      expect(v.itemsOrigen.itemQ).toEqual({
        valor: null, origen: 'manual', soloLectura: false, motivo: 'El control vinculado no trae circunferenciaBraquial: el ítem se registra a mano',
      });
      expect(v.itemsOrigen.itemR).toMatchObject({ valor: 1, origen: 'control', soloLectura: true });
      expect(v.segundaParte.itemsFaltantes).toEqual([...G_P_FALTANTES, 'itemQ']);
    });

    it('control sin ninguna de las dos medidas: Q y R manuales, ambos en itemsFaltantes', async () => {
      const { svc, control } = escenario();
      control({ id: 7 });
      const v = await svc.calcular(1, dto({ ...CRIBAJE_13, controlNutricionalId: 7 }));
      expect(v.itemsOrigen.itemQ.origen).toBe('manual');
      expect(v.itemsOrigen.itemR.origen).toBe('manual');
      expect(v.segundaParte.itemsFaltantes).toEqual([...G_P_FALTANTES, 'itemQ', 'itemR']);
    });

    it('sin vínculo: F, Q y R manuales con el motivo «sin vínculo»; el valor enviado se refleja', async () => {
      const { svc } = escenario();
      const v = await svc.calcular(1, dto({ ...CRIBAJE_13, itemF: 3, itemQ: 0.5 }));
      expect(v.itemsOrigen).toEqual({
        itemF: { valor: 3, origen: 'manual', soloLectura: false, motivo: MOTIVO_SIN_VINCULO },
        itemQ: { valor: 0.5, origen: 'manual', soloLectura: false, motivo: MOTIVO_SIN_VINCULO },
        itemR: { valor: null, origen: 'manual', soloLectura: false, motivo: MOTIVO_SIN_VINCULO },
      });
    });

    it('con G–P completos y Q/R omitidos: se derivan, la segunda parte queda completa y se calcula todo', async () => {
      const { svc, control } = escenario();
      control({ id: 7, imc: 22.4, circunferenciaBraquial: 22.5, circunferenciaPantorrilla: 30.4 });
      const v = await svc.calcular(1, dto({ ...CRIBAJE_9, controlNutricionalId: 7, ...G_P_MAX }));
      expect(v.segundaParte).toEqual({ requerida: true, completa: true, itemsFaltantes: [] });
      // G–P = 14; Q (CB 22,5 ⇒ 23) = 1; R (CP 30,4 ⇒ 30) = 0 ⇒ evaluación 15; cribaje 9 + F 2 = ... ver subtotal del cribaje
      expect(v.subtotalEvaluacion).toBe(15);
      expect(v.evaluacionGlobal).toBe(v.subtotalCribaje + 15);
    });

    it('manual igual al derivado se acepta; distinto ⇒ 400 con el texto exacto (CB y CP)', async () => {
      const { svc, control } = escenario();
      control({ id: 7, circunferenciaBraquial: 21.4, circunferenciaPantorrilla: 30.4 });
      await expect(svc.calcular(1, dto({ ...CRIBAJE_9, controlNutricionalId: 7, itemQ: 0.5, itemR: 0 }))).resolves.toBeDefined();
      expect(await erroresDe(svc.calcular(1, dto({ ...CRIBAJE_9, controlNutricionalId: 7, itemQ: 1 })))).toEqual([
        'itemQ no coincide con la circunferencia braquial del control vinculado: CB 21.4 ⇒ 21 ⇒ itemQ 0.5',
      ]);
      expect(await erroresDe(svc.calcular(1, dto({ ...CRIBAJE_9, controlNutricionalId: 7, itemR: 1 })))).toEqual([
        'itemR no coincide con la circunferencia de la pantorrilla del control vinculado: CP 30.4 ⇒ 30 ⇒ itemR 0',
      ]);
      // ambos incorrectos a la vez: los dos errores juntos
      expect(await erroresDe(svc.calcular(1, dto({ ...CRIBAJE_9, controlNutricionalId: 7, itemQ: 0, itemR: 1 })))).toHaveLength(2);
    });

    it.each([
      [20.4, 0], [20.5, 0.5], [20.9, 0.5], [21, 0.5], [22, 0.5], [22.4, 0.5], [22.5, 1], [23, 1],
    ])('frontera de Q con CB %p ⇒ itemQ %p (vía el servicio)', async (cb, q) => {
      const { svc, control } = escenario();
      control({ id: 7, circunferenciaBraquial: cb });
      const v = await svc.calcular(1, dto({ ...CRIBAJE_9, controlNutricionalId: 7 }));
      expect(v.itemsOrigen.itemQ).toMatchObject({ valor: q, origen: 'control', soloLectura: true, medida: cb });
    });

    it.each([[30.4, 0], [30.5, 1], [31, 1]])('frontera de R con CP %p ⇒ itemR %p (vía el servicio)', async (cp, r) => {
      const { svc, control } = escenario();
      control({ id: 7, circunferenciaPantorrilla: cp });
      const v = await svc.calcular(1, dto({ ...CRIBAJE_9, controlNutricionalId: 7 }));
      expect(v.itemsOrigen.itemR).toMatchObject({ valor: r, origen: 'control', soloLectura: true, medida: cp });
    });
  });

  describe('registro (guardar lo derivado)', () => {
    it('G–P completos y Q/R omitidos con control que trae CB y CP: se GUARDAN derivados y la segunda parte queda completa', async () => {
      const { svc, control } = escenario();
      control({ id: 7, imc: 22.4, circunferenciaBraquial: 21.4, circunferenciaPantorrilla: 30.5 });
      const e = await svc.crear(1, dto({ ...CRIBAJE_9, controlNutricionalId: 7, ...G_P_MAX }), USUARIO);
      expect(e).toMatchObject({ itemF: 2, itemQ: 0.5, itemR: 1, subtotalEvaluacion: 14 + 0.5 + 1, controlNutricionalId: 7 });
      expect(e.evaluacionGlobal).toBe(e.subtotalCribaje + 15.5);
    });

    it('MÁXIMO GLOBAL 30 con Q y R derivados (CB 25, CP 35): 14 de cribaje + 16 de evaluación', async () => {
      const { svc, control } = escenario();
      control({ id: 7, imc: 25.3, circunferenciaBraquial: 25, circunferenciaPantorrilla: 35 });
      const e = await svc.crear(1, dto({ ...CRIBAJE_13, controlNutricionalId: 7, ...G_P_MAX }), USUARIO);
      expect(e).toMatchObject({ itemF: 3, itemQ: 1, itemR: 1, subtotalCribaje: 14, subtotalEvaluacion: 16, evaluacionGlobal: 30, interpretacionGlobal: 'Estado nutricional normal' });
      const v = await svc.calcular(1, dto({ ...CRIBAJE_13, controlNutricionalId: 7, ...G_P_MAX })).catch((x: unknown) => x);
      expect((v as Error).message).toContain('ya está vinculado'); // el control quedó ocupado; la vista previa informa lo mismo que el registro
    });

    it('MÍNIMO con todo derivado a 0 (CB 20,4, CP 30,4 y G–P en 0)', async () => {
      const { svc, control } = escenario();
      control({ id: 7, imc: 15, circunferenciaBraquial: 20.4, circunferenciaPantorrilla: 30.4 });
      const e = await svc.crear(1, dto({ itemA: 0, itemB: 0, itemC: 0, itemD: 0, itemE: 0, controlNutricionalId: 7, ...G_P_BAJO }), USUARIO);
      expect(e).toMatchObject({ itemF: 0, itemQ: 0, itemR: 0, subtotalCribaje: 0, subtotalEvaluacion: 0, evaluacionGlobal: 0, interpretacionGlobal: 'Malnutrición' });
    });

    it('SIN segunda parte con cribaje ≥ 12 y control con CB/CP: G–R quedan NULL (lo derivado NO se guarda)', async () => {
      const { svc, control } = escenario();
      control({ id: 7, imc: 25.3, circunferenciaBraquial: 25, circunferenciaPantorrilla: 35 });
      const e = await svc.crear(1, dto({ ...CRIBAJE_13, controlNutricionalId: 7 }), USUARIO);
      for (const c of ['itemG', 'itemH', 'itemI', 'itemJ', 'itemK', 'itemL', 'itemM', 'itemN', 'itemO', 'itemP', 'itemQ', 'itemR'] as const) {
        expect(e[c]).toBeNull();
      }
      expect(e).toMatchObject({ itemF: 3, subtotalEvaluacion: null, evaluacionGlobal: null, interpretacionGlobal: null });
    });

    it('distinción vista previa vs registro: con control y sin ítems de G–P, la vista previa muestra Q/R y el registro NO los guarda', async () => {
      const { svc, control } = escenario();
      control({ id: 7, imc: 25.3, circunferenciaBraquial: 25, circunferenciaPantorrilla: 35 });
      const cuerpo = dto({ ...CRIBAJE_13, controlNutricionalId: 7 });
      const vista = await svc.calcular(1, cuerpo);
      expect(vista.itemsOrigen.itemQ).toMatchObject({ valor: 1, origen: 'control', soloLectura: true });
      expect(vista.itemsOrigen.itemR).toMatchObject({ valor: 1, origen: 'control', soloLectura: true });
      const guardada = await svc.crear(1, cuerpo, USUARIO);
      expect(guardada.itemQ).toBeNull();
      expect(guardada.itemR).toBeNull();
    });

    it('cribaje ≥ 12 con SOLO un ítem de la segunda parte (aunque Q/R se deriven): sigue siendo «a medias» ⇒ 400 con G–P faltantes (sin Q/R)', async () => {
      const { svc, control } = escenario();
      control({ id: 7, circunferenciaBraquial: 25, circunferenciaPantorrilla: 35 });
      expect(await erroresDe(svc.crear(1, dto({ ...CRIBAJE_13, controlNutricionalId: 7, itemG: 1 }), USUARIO))).toEqual([
        'La segunda parte (ítems G a R) se envía completa o no se envía: faltan itemH, itemI, itemJ, itemK, itemL, itemM, itemN, itemO, itemP',
      ]);
    });

    it('cribaje < 12 sin segunda parte y control con CB/CP: 400 que lista solo G–P (Q/R se derivarían)', async () => {
      const { svc, control, filas } = escenario();
      control({ id: 7, circunferenciaBraquial: 25, circunferenciaPantorrilla: 35 });
      const errores = await erroresDe(svc.crear(1, dto({ ...CRIBAJE_9, controlNutricionalId: 7 }), USUARIO));
      expect(errores).toHaveLength(1);
      expect(errores[0]).toContain(`faltan ${G_P_FALTANTES.join(', ')}`);
      expect(errores[0]).not.toContain('itemQ');
      expect(errores[0]).not.toContain('itemR');
      expect(filas()).toHaveLength(0);
    });

    it('control SIN CB: Q hay que enviarlo a mano; si falta, 400 «faltan itemQ»; con Q manual se guarda', async () => {
      const { svc, control } = escenario();
      control({ id: 7, imc: 22.4, circunferenciaBraquial: null, circunferenciaPantorrilla: 31 });
      const base = { ...CRIBAJE_9, controlNutricionalId: 7, ...G_P_MAX };
      expect((await erroresDe(svc.crear(1, dto(base), USUARIO)))[0]).toContain('faltan itemQ');
      const e = await svc.crear(1, dto({ ...base, itemQ: 0.5 }), USUARIO);
      expect(e).toMatchObject({ itemQ: 0.5, itemR: 1 });
    });

    it('mismatch en el registro ⇒ 400 y no guarda nada (mismo texto que la vista previa)', async () => {
      const { svc, control, filas } = escenario();
      control({ id: 7, circunferenciaBraquial: 21.4 });
      const cuerpo = dto({ ...CRIBAJE_9, controlNutricionalId: 7, ...G_P_MAX, itemQ: 1, itemR: 0 });
      const registro = await erroresDe(svc.crear(1, cuerpo, USUARIO));
      expect(registro).toEqual(['itemQ no coincide con la circunferencia braquial del control vinculado: CB 21.4 ⇒ 21 ⇒ itemQ 0.5']);
      expect(await erroresDe(svc.calcular(1, cuerpo))).toEqual(registro);
      expect(filas()).toHaveLength(0);
    });

    it('sin vínculo Q y R siguen manuales (se guardan tal cual)', async () => {
      const { svc } = escenario();
      const e = await svc.crear(1, dto({ ...CRIBAJE_9, itemF: 2, ...G_P_MAX, itemQ: 0.5, itemR: 1 }), USUARIO);
      expect(e).toMatchObject({ itemQ: 0.5, itemR: 1, controlNutricionalId: null });
    });

    it('lo derivado se ALMACENA: si el control se anula después, la evaluación conserva itemQ e itemR (RN-04)', async () => {
      const { svc, control } = escenario();
      const c = control({ id: 7, imc: 22.4, circunferenciaBraquial: 22.4, circunferenciaPantorrilla: 31 });
      const e = await svc.crear(1, dto({ ...CRIBAJE_9, controlNutricionalId: 7, ...G_P_MAX }), USUARIO);
      c.anulado = true; // se anula el control (y hasta cambia su medida): nada se recalcula
      c.circunferenciaBraquial = 40;
      expect((await svc.listar(1, {}))[0]).toMatchObject({ id: e.id, itemQ: 0.5, itemR: 1, itemF: 2 });
    });

    it('el registro y la vista previa dan el MISMO global para el mismo cuerpo (misma función)', async () => {
      const { svc, control } = escenario();
      control({ id: 7, imc: 22.4, circunferenciaBraquial: 21, circunferenciaPantorrilla: 31 });
      const cuerpo = dto({ ...CRIBAJE_9, controlNutricionalId: 7, ...G_P_MAX });
      const vista = await svc.calcular(1, cuerpo);
      const e = await svc.crear(1, cuerpo, USUARIO);
      expect(e.evaluacionGlobal).toBe(vista.evaluacionGlobal);
      expect(e.subtotalEvaluacion).toBe(vista.subtotalEvaluacion);
      expect(vista.itemsOrigen.itemQ.valor).toBe(e.itemQ);
      expect(vista.itemsOrigen.itemR.valor).toBe(e.itemR);
    });
  });
});
