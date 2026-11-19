import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  abrirDataSourceDeIntegracion,
  INTEGRACION_ACTIVA,
  nuevoExpedienteConResidente,
} from 'src/modulos/terapia-fisica/valoraciones/testing/integracion';
import { ControlesNutricionalesService } from '../controles/controles-nutricionales.service';
import { EvaluacionMna } from '../entities/evaluacion-mna.entity';
import { CrearEvaluacionMnaDto } from './dto/evaluacion-mna.dto';
import { EvaluacionesMnaService } from './evaluaciones-mna.service';

/**
 * INTEGRACIÓN con MySQL REAL (opt-in) de Q y R derivados del control vinculado: las circunferencias con decimales
 * (`decimal(5,1)`) llegan sin pérdida, se clasifican con el redondeo al entero más cercano (.5 sube) y lo derivado se
 * guarda tal cual aunque luego se anule el control.
 *
 *   RUN_DB_INTEGRATION=1 DB_TEST_NAME=sidnam_scratch_b4 npx jest integration --runInBand
 */
const dto = (parcial: object): CrearEvaluacionMnaDto => parcial as CrearEvaluacionMnaDto;
const CRIBAJE_13 = { itemA: 2, itemB: 3, itemC: 2, itemD: 2, itemE: 2 };
const G_P_MAX = { itemG: 1, itemH: 1, itemI: 1, itemJ: 2, itemK: 1, itemL: 1, itemM: 1, itemN: 2, itemO: 2, itemP: 2 };

(INTEGRACION_ACTIVA ? describe : describe.skip)('MNA — Q y R derivados del control (integración MySQL)', () => {
  jest.setTimeout(240_000);
  let ds: DataSource;
  let svc: EvaluacionesMnaService;
  let controles: ControlesNutricionalesService;

  beforeAll(async () => {
    ds = await abrirDataSourceDeIntegracion();
    svc = new EvaluacionesMnaService(ds);
    controles = new ControlesNutricionalesService(ds);
  });

  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  const expediente = () => nuevoExpedienteConResidente(ds, new Date('1940-05-12'));
  /** Control real: 58,4 kg y 152 cm ⇒ IMC 25,3 ⇒ itemF = 3. */
  const control = async (exp: number, medidas: { cb?: number; cp?: number } = {}) =>
    (
      await controles.crear(
        exp,
        { peso: 58.4, talla: 152, fecha: '2026-10-01', circunferenciaBraquial: medidas.cb, circunferenciaPantorrilla: medidas.cp },
        7,
      )
    ).id;
  const leer = (id: number) => ds.getRepository(EvaluacionMna).findOneByOrFail({ id });

  it('decimales sin pérdida: CB 21,4 y CP 30,5 ⇒ Q 0,5 y R 1 (derivados, guardados como decimal)', async () => {
    const exp = await expediente();
    const c = await control(exp, { cb: 21.4, cp: 30.5 });
    const e = await svc.crear(exp, dto({ ...CRIBAJE_13, controlNutricionalId: c, ...G_P_MAX }), 7);
    expect(await leer(e.id)).toMatchObject({ controlNutricionalId: c, itemF: 3, itemQ: 0.5, itemR: 1, subtotalEvaluacion: 15.5 });
    const crudo: { q: string; r: string }[] = await ds.query('SELECT CAST(itemQ AS CHAR) AS q, CAST(itemR AS CHAR) AS r FROM evaluacion_mna WHERE id = ?', [e.id]);
    expect(crudo[0]).toEqual({ q: '0.5', r: '1' });
  });

  it.each([
    [20.4, 0], [20.5, 0.5], [20.9, 0.5], [21, 0.5], [22, 0.5], [22.4, 0.5], [22.5, 1], [23, 1],
  ])('frontera de Q con una CB real de %p ⇒ itemQ %p', async (cb, q) => {
    const exp = await expediente();
    const c = await control(exp, { cb });
    const v = await svc.calcular(exp, dto({ ...CRIBAJE_13, controlNutricionalId: c }));
    expect(v.itemsOrigen.itemQ).toMatchObject({ valor: q, origen: 'control', soloLectura: true, medida: cb });
  });

  it.each([[30.4, 0], [30.5, 1], [31, 1]])('frontera de R con una CP real de %p ⇒ itemR %p', async (cp, r) => {
    const exp = await expediente();
    const c = await control(exp, { cp });
    const v = await svc.calcular(exp, dto({ ...CRIBAJE_13, controlNutricionalId: c }));
    expect(v.itemsOrigen.itemR).toMatchObject({ valor: r, origen: 'control', soloLectura: true, medida: cp });
  });

  it('vista previa con control y SIN ningún ítem de G–P: Q/R de solo lectura y itemsFaltantes sin Q/R; el registro sin segunda parte deja G–R en NULL', async () => {
    const exp = await expediente();
    const c = await control(exp, { cb: 25, cp: 35 });
    const cuerpo = dto({ ...CRIBAJE_13, controlNutricionalId: c });
    const vista = await svc.calcular(exp, cuerpo);
    expect(vista.itemsOrigen.itemQ).toMatchObject({ valor: 1, origen: 'control', medida: 25, medidaRedondeada: 25 });
    expect(vista.segundaParte.itemsFaltantes).toHaveLength(10);
    expect(vista.segundaParte.itemsFaltantes).not.toContain('itemQ');
    const e = await svc.crear(exp, cuerpo, 7);
    expect(await leer(e.id)).toMatchObject({ itemG: null, itemP: null, itemQ: null, itemR: null, subtotalEvaluacion: null, evaluacionGlobal: null });
  });

  it('máximo global 30 con Q y R derivados (CB 25, CP 35)', async () => {
    const exp = await expediente();
    const c = await control(exp, { cb: 25, cp: 35 });
    const e = await svc.crear(exp, dto({ ...CRIBAJE_13, controlNutricionalId: c, ...G_P_MAX }), 7);
    expect(await leer(e.id)).toMatchObject({ itemQ: 1, itemR: 1, subtotalCribaje: 14, subtotalEvaluacion: 16, evaluacionGlobal: 30 });
  });

  it('mismatch ⇒ 400 y no se guarda nada; control sin la medida ⇒ el ítem se pide a mano', async () => {
    const exp = await expediente();
    const c = await control(exp, { cb: 21.4 }); // sin CP
    const base = { ...CRIBAJE_13, controlNutricionalId: c, ...G_P_MAX };
    await expect(svc.crear(exp, dto({ ...base, itemQ: 1 }), 7)).rejects.toBeInstanceOf(BadRequestException);
    expect(await ds.getRepository(EvaluacionMna).count({ where: { expedienteId: exp } })).toBe(0);
    await expect(svc.crear(exp, dto(base), 7)).rejects.toBeInstanceOf(BadRequestException); // falta itemR (el control no trae CP)
    const e = await svc.crear(exp, dto({ ...base, itemR: 1 }), 7);
    expect(await leer(e.id)).toMatchObject({ itemQ: 0.5, itemR: 1 });
  });

  it('lo derivado se almacena: anular el control después no cambia itemQ ni itemR (RN-04)', async () => {
    const exp = await expediente();
    const c = await control(exp, { cb: 22.4, cp: 31 });
    const e = await svc.crear(exp, dto({ ...CRIBAJE_13, controlNutricionalId: c, ...G_P_MAX }), 7);
    await controles.anular(c, 'Error de digitación', 8);
    expect(await leer(e.id)).toMatchObject({ itemQ: 0.5, itemR: 1, subtotalEvaluacion: 15.5 });
  });
});
