/* eslint-disable @typescript-eslint/no-unsafe-argument -- base simulada en memoria */
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { crearDbSimulada } from 'src/modulos/terapia-fisica/valoraciones/testing/db-simulada';
import { ControlNutricional } from '../entities/control-nutricional.entity';
import { EvaluacionMna } from '../entities/evaluacion-mna.entity';
import { CrearEvaluacionMnaDto } from './dto/evaluacion-mna.dto';
import { EvaluacionesMnaService } from './evaluaciones-mna.service';

/**
 * Servicio del MNA contra la base simulada. Expedientes 1 y 2. «Hoy» = 2026-10-21 (18:00 en Costa Rica =
 * 2026-10-22T00:00Z, para comprobar que el día por defecto es el de Costa Rica y no el de UTC).
 */
const HOY = '2026-10-21';
const AHORA = new Date('2026-10-22T00:00:00.000Z');
const USUARIO = 9;

/** Cribaje de 9 puntos (riesgo): A1 B2 C1 D2 E1 + F2. */
const CRIBAJE_9 = { itemA: 1, itemB: 2, itemC: 1, itemD: 2, itemE: 1 };
/** Cribaje de 13 puntos (normal): A2 B3 C2 D2 E2 + F2. */
const CRIBAJE_13 = { itemA: 2, itemB: 3, itemC: 2, itemD: 2, itemE: 2 };
/** Segunda parte de 12,5 puntos (CA-16). */
const EVALUACION_12_5 = { itemG: 1, itemH: 1, itemI: 1, itemJ: 2, itemK: 0.5, itemL: 1, itemM: 1, itemN: 2, itemO: 2, itemP: 1, itemQ: 0, itemR: 0 };
/** Segunda parte de 16 puntos (máximo). */
const EVALUACION_16 = { itemG: 1, itemH: 1, itemI: 1, itemJ: 2, itemK: 1, itemL: 1, itemM: 1, itemN: 2, itemO: 2, itemP: 2, itemQ: 1, itemR: 1 };

const dto = (parcial: object): CrearEvaluacionMnaDto => parcial as CrearEvaluacionMnaDto;
const CA16 = { ...CRIBAJE_9, itemF: 2, ...EVALUACION_12_5 };

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

describe('EvaluacionesMnaService', () => {
  beforeEach(() => {
    // Solo se congela el reloj (Date); promesas y temporizadores siguen reales.
    jest.useFakeTimers({
      now: AHORA,
      doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate', 'clearImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'hrtime', 'performance'],
    });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('crear', () => {
    it('CA-16 sin vínculo: cribaje 9 + evaluación 12,5 ⇒ global 21,5 «Riesgo de malnutrición»; la respuesta incluye lo calculado', async () => {
      const { svc } = escenario();
      const e = await svc.crear(1, dto(CA16), USUARIO);
      expect(e).toMatchObject({
        expedienteId: 1,
        fecha: HOY,
        usuarioResponsableId: USUARIO,
        creadoPorId: USUARIO,
        controlNutricionalId: null,
        itemF: 2,
        subtotalCribaje: 9,
        interpretacionCribaje: 'Riesgo de malnutrición. Continuar la evaluación.',
        subtotalEvaluacion: 12.5,
        evaluacionGlobal: 21.5,
        interpretacionGlobal: 'Riesgo de malnutrición',
        versionInstrumento: 'MNA-v1',
        anulado: false,
        itemK: 0.5,
        itemQ: 0,
      });
    });

    it('MÁXIMO 30 y MÍNIMO 0', async () => {
      const { svc } = escenario();
      const max = await svc.crear(1, dto({ ...CRIBAJE_13, itemA: 2, itemF: 3, ...EVALUACION_16 }), USUARIO);
      expect(max).toMatchObject({ subtotalCribaje: 14, subtotalEvaluacion: 16, evaluacionGlobal: 30, interpretacionGlobal: 'Estado nutricional normal' });
      const min = await svc.crear(
        1,
        dto({ itemA: 0, itemB: 0, itemC: 0, itemD: 0, itemE: 0, itemF: 0, itemG: 0, itemH: 0, itemI: 0, itemJ: 0, itemK: 0, itemL: 0, itemM: 0, itemN: 0, itemO: 0, itemP: 0, itemQ: 0, itemR: 0 }),
        USUARIO,
      );
      expect(min).toMatchObject({ subtotalCribaje: 0, evaluacionGlobal: 0, interpretacionGlobal: 'Malnutrición' });
    });

    it('lo calculado NUNCA se acepta del cliente: aunque llegue en el objeto, se ignora y se recalcula', async () => {
      const { svc } = escenario();
      const malicioso = { ...CA16, subtotalCribaje: 14, evaluacionGlobal: 30, interpretacionGlobal: 'Estado nutricional normal', versionInstrumento: 'MNA-v9', usuarioResponsableId: 500, expedienteId: 2, anulado: true, creadoPorId: 500 };
      const e = await svc.crear(1, dto(malicioso), USUARIO);
      expect(e).toMatchObject({ subtotalCribaje: 9, evaluacionGlobal: 21.5, interpretacionGlobal: 'Riesgo de malnutrición', versionInstrumento: 'MNA-v1', usuarioResponsableId: USUARIO, expedienteId: 1, anulado: false, creadoPorId: USUARIO });
    });

    it('fecha pasada válida; futura o inexistente ⇒ 400 y nada se guarda', async () => {
      const { svc, filas } = escenario();
      await expect(svc.crear(1, dto({ ...CA16, fecha: '2026-04-21' }), USUARIO)).resolves.toMatchObject({ fecha: '2026-04-21' });
      expect(await erroresDe(svc.crear(1, dto({ ...CA16, fecha: '2026-10-22' }), USUARIO))).toEqual(['La fecha de la evaluación no puede ser posterior a hoy']);
      expect(await erroresDe(svc.crear(1, dto({ ...CA16, fecha: '2026-02-30' }), USUARIO))).toEqual(['La fecha de la evaluación no es una fecha válida (formato YYYY-MM-DD)']);
      expect(filas()).toHaveLength(1);
    });

    it('expediente inexistente ⇒ 404 y no se crea nada (RN-01)', async () => {
      const { svc, filas } = escenario();
      await expect(svc.crear(99, dto(CA16), USUARIO)).rejects.toBeInstanceOf(NotFoundException);
      expect(filas()).toHaveLength(0);
    });

    describe('segunda parte según el cribaje (RF-NU-03 / RN-07)', () => {
      it('cribaje < 12 sin segunda parte ⇒ 400: es obligatoria (supuesto pendiente de confirmar con la Jefatura)', async () => {
        const { svc, filas } = escenario();
        const e = await erroresDe(svc.crear(1, dto({ ...CRIBAJE_9, itemF: 2 }), USUARIO));
        expect(e).toHaveLength(1);
        expect(e[0]).toContain('obligatoria cuando el subtotal de cribaje es menor que 12 (subtotal 9)');
        expect(filas()).toHaveLength(0);
      });

      it('cribaje < 12 con segunda parte incompleta ⇒ 400 con los ítems que faltan', async () => {
        const { svc } = escenario();
        const { itemR, ...sinR } = EVALUACION_12_5;
        void itemR;
        expect((await erroresDe(svc.crear(1, dto({ ...CRIBAJE_9, itemF: 2, ...sinR }), USUARIO)))[0]).toContain('faltan itemR');
      });

      it('cribaje ≥ 12 sin segunda parte ⇒ se registra: evaluación, global e interpretación global en null', async () => {
        const { svc } = escenario();
        const e = await svc.crear(1, dto({ ...CRIBAJE_13, itemF: 2 }), USUARIO);
        expect(e).toMatchObject({
          subtotalCribaje: 13,
          interpretacionCribaje: 'Estado nutricional normal. No es necesario continuar la evaluación.',
          itemG: null,
          itemR: null,
          subtotalEvaluacion: null,
          evaluacionGlobal: null,
          interpretacionGlobal: null,
        });
      });

      it('cribaje ≥ 12 con la segunda parte completa ⇒ la profesional decide continuar: se calcula todo', async () => {
        const { svc } = escenario();
        const e = await svc.crear(1, dto({ ...CRIBAJE_13, itemF: 2, ...EVALUACION_16 }), USUARIO);
        expect(e).toMatchObject({ subtotalCribaje: 13, subtotalEvaluacion: 16, evaluacionGlobal: 29, interpretacionGlobal: 'Estado nutricional normal' });
      });

      it('cribaje ≥ 12 con la segunda parte a medias ⇒ 400 (todo o nada)', async () => {
        const { svc } = escenario();
        const e = await erroresDe(svc.crear(1, dto({ ...CRIBAJE_13, itemF: 2, itemG: 1, itemH: 1 }), USUARIO));
        expect(e[0]).toContain('se envía completa o no se envía');
      });

      it('FRONTERA: cribaje 11 ⇒ obligatoria; cribaje 12 ⇒ opcional', async () => {
        const { svc } = escenario();
        await expect(svc.crear(1, dto({ itemA: 2, itemB: 3, itemC: 1, itemD: 2, itemE: 1, itemF: 2 }), USUARIO)).rejects.toBeInstanceOf(BadRequestException); // 11
        await expect(svc.crear(1, dto({ itemA: 2, itemB: 3, itemC: 2, itemD: 2, itemE: 1, itemF: 2 }), USUARIO)).resolves.toMatchObject({ subtotalCribaje: 12 });
      });
    });

    describe('ítem F y vínculo con el control nutricional', () => {
      it('con vínculo: itemF se DERIVA del IMC del control (25,3 ⇒ 3) aunque no se envíe; se guarda el controlNutricionalId y se toma el candado de la fila', async () => {
        const { svc, db, control } = escenario();
        control({ id: 7, imc: 25.3 });
        const e = await svc.crear(1, dto({ ...CRIBAJE_9, ...EVALUACION_12_5, controlNutricionalId: 7 }), USUARIO);
        expect(e).toMatchObject({ controlNutricionalId: 7, itemF: 3, subtotalCribaje: 10, subtotalEvaluacion: 12.5, evaluacionGlobal: 22.5 });
        expect(db.log).toContain('lock:ControlNutricional:7');
      });

      it.each([
        [18.9, 0],
        [19.0, 1],
        [20.9, 1],
        [21.0, 2],
        [22.9, 2],
        [23.0, 3],
      ])('IMC %p del control ⇒ itemF %p', async (imc, f) => {
        const { svc, control } = escenario();
        control({ id: 7, imc });
        const e = await svc.crear(1, dto({ ...CRIBAJE_13, ...EVALUACION_16, controlNutricionalId: 7 }), USUARIO);
        expect(e.itemF).toBe(f);
      });

      it('itemF manual IGUAL al derivado ⇒ se acepta; DISTINTO ⇒ 400 y no se guarda nada', async () => {
        const { svc, control, filas } = escenario();
        control({ id: 7, imc: 25.3 });
        await expect(svc.crear(1, dto({ ...CRIBAJE_13, ...EVALUACION_16, itemF: 3, controlNutricionalId: 7 }), USUARIO)).resolves.toMatchObject({ itemF: 3 });
        control({ id: 8, imc: 25.3 });
        expect(await erroresDe(svc.crear(1, dto({ ...CRIBAJE_13, ...EVALUACION_16, itemF: 1, controlNutricionalId: 8 }), USUARIO))).toEqual([
          'itemF no coincide con el IMC del control vinculado: IMC 25.3 ⇒ itemF 3',
        ]);
        expect(filas()).toHaveLength(1);
      });

      it('sin vínculo y sin itemF ⇒ 400', async () => {
        const { svc } = escenario();
        expect(await erroresDe(svc.crear(1, dto({ ...CRIBAJE_13 }), USUARIO))).toEqual(['itemF es obligatorio cuando no se vincula un control nutricional']);
      });

      it('control de OTRO expediente ⇒ 400', async () => {
        const { svc, control, filas } = escenario();
        control({ id: 7, expedienteId: 2 });
        expect(await erroresDe(svc.crear(1, dto({ ...CA16, controlNutricionalId: 7 }), USUARIO))).toEqual(['controlNutricionalId 7 no pertenece a este expediente']);
        expect(filas()).toHaveLength(0);
      });

      it('control ANULADO ⇒ 400; control inexistente ⇒ 400', async () => {
        const { svc, control } = escenario();
        control({ id: 7, anulado: true });
        expect(await erroresDe(svc.crear(1, dto({ ...CA16, controlNutricionalId: 7 }), USUARIO))).toEqual(['controlNutricionalId 7 está anulado']);
        expect(await erroresDe(svc.crear(1, dto({ ...CA16, controlNutricionalId: 99 }), USUARIO))).toEqual(['controlNutricionalId 99 no existe']);
      });

      it('control POSTERIOR a la fecha de la evaluación ⇒ 400; del mismo día es válido', async () => {
        const { svc, control } = escenario();
        control({ id: 7, fecha: '2026-10-21' });
        await expect(svc.crear(1, dto({ ...CRIBAJE_13, ...EVALUACION_16, controlNutricionalId: 7, fecha: '2026-10-21' }), USUARIO)).resolves.toBeDefined();
        control({ id: 8, fecha: '2026-10-21' });
        expect((await erroresDe(svc.crear(1, dto({ ...CRIBAJE_13, ...EVALUACION_16, controlNutricionalId: 8, fecha: '2026-10-20' }), USUARIO)))[0]).toContain('posterior a la fecha de la evaluación');
      });

      it('un control ya vinculado a una evaluación ACTIVA ⇒ 409; tras anular esa evaluación se puede vincular de nuevo', async () => {
        const { svc, control } = escenario();
        control({ id: 7, imc: 25.3 });
        const primera = await svc.crear(1, dto({ ...CRIBAJE_13, ...EVALUACION_16, controlNutricionalId: 7 }), USUARIO);
        await expect(svc.crear(1, dto({ ...CRIBAJE_13, ...EVALUACION_16, controlNutricionalId: 7 }), USUARIO)).rejects.toBeInstanceOf(ConflictException);
        await svc.anular(primera.id, 'Error de digitación', 11);
        await expect(svc.crear(1, dto({ ...CRIBAJE_13, ...EVALUACION_16, controlNutricionalId: 7 }), USUARIO)).resolves.toMatchObject({ controlNutricionalId: 7 });
      });

      it('RN-04: si el control se anula DESPUÉS, la evaluación conserva su itemF y su cálculo', async () => {
        const { svc, control, db } = escenario();
        control({ id: 7, imc: 25.3 });
        const e = await svc.crear(1, dto({ ...CRIBAJE_13, ...EVALUACION_16, controlNutricionalId: 7 }), USUARIO);
        (db.filas(ControlNutricional)[0] as ControlNutricional).anulado = true;
        const [guardada] = await svc.listar(1, {});
        expect(guardada).toMatchObject({ id: e.id, itemF: 3, subtotalCribaje: 14, controlNutricionalId: 7 });
      });

      it('con un vínculo inválido no se evalúan el ítem F ni la segunda parte (no se apilan errores engañosos)', async () => {
        const { svc } = escenario();
        expect(await erroresDe(svc.crear(1, dto({ ...CRIBAJE_9, controlNutricionalId: 99 }), USUARIO))).toEqual(['controlNutricionalId 99 no existe']);
      });
    });
  });

  describe('calcular (vista previa, sin guardar)', () => {
    const TODOS_G_R = ['itemG', 'itemH', 'itemI', 'itemJ', 'itemK', 'itemL', 'itemM', 'itemN', 'itemO', 'itemP', 'itemQ', 'itemR'];

    it('cribaje 9 + G–R completo: devuelve todo, igual que el registro, y NO guarda nada', async () => {
      const { svc, filas } = escenario();
      const vista = await svc.calcular(1, dto(CA16));
      expect(filas()).toHaveLength(0);
      expect(vista).toEqual({
        subtotalCribaje: 9,
        interpretacionCribaje: 'Riesgo de malnutrición. Continuar la evaluación.',
        subtotalEvaluacion: 12.5,
        evaluacionGlobal: 21.5,
        interpretacionGlobal: 'Riesgo de malnutrición',
        versionInstrumento: 'MNA-v1',
        itemF: 2,
        segundaParte: { requerida: true, completa: true, itemsFaltantes: [] },
        itemsOrigen: expect.any(Object) as unknown, // aditivo (Parte B): su contenido se prueba en mna.derivacion.service.spec.ts
      });
      const oficial = await svc.crear(1, dto(CA16), USUARIO);
      for (const k of ['subtotalCribaje', 'interpretacionCribaje', 'subtotalEvaluacion', 'evaluacionGlobal', 'interpretacionGlobal', 'itemF'] as const) {
        expect(oficial[k]).toBe(vista[k]);
      }
    });

    it('cribaje 9 SIN G–R: NO es error; devuelve el cribaje y segundaParte requerida=true, completa=false con los doce faltantes', async () => {
      const { svc, filas } = escenario();
      const vista = await svc.calcular(1, dto({ ...CRIBAJE_9, itemF: 2 }));
      expect(vista).toEqual({
        subtotalCribaje: 9,
        interpretacionCribaje: 'Riesgo de malnutrición. Continuar la evaluación.',
        subtotalEvaluacion: null,
        evaluacionGlobal: null,
        interpretacionGlobal: null,
        versionInstrumento: 'MNA-v1',
        itemF: 2,
        segundaParte: { requerida: true, completa: false, itemsFaltantes: TODOS_G_R },
        itemsOrigen: expect.any(Object) as unknown, // aditivo (Parte B): su contenido se prueba en mna.derivacion.service.spec.ts
      });
      expect(filas()).toHaveLength(0);
      // el registro, en cambio, sigue siendo estricto
      expect((await erroresDe(svc.crear(1, dto({ ...CRIBAJE_9, itemF: 2 }), USUARIO)))[0]).toContain('es obligatoria cuando el subtotal de cribaje es menor que 12');
    });

    it('cribaje 13 SIN G–R: cribaje completo, requerida=false, completa=false, evaluación/global/interpretación en null', async () => {
      const { svc } = escenario();
      expect(await svc.calcular(1, dto({ ...CRIBAJE_13, itemF: 2 }))).toMatchObject({
        subtotalCribaje: 13,
        interpretacionCribaje: 'Estado nutricional normal. No es necesario continuar la evaluación.',
        subtotalEvaluacion: null,
        evaluacionGlobal: null,
        interpretacionGlobal: null,
        segundaParte: { requerida: false, completa: false, itemsFaltantes: TODOS_G_R },
      });
    });

    it('cribaje 13 con G–R A MEDIAS: NO es error en la vista previa (completa=false con los faltantes en orden); el registro sí lo rechaza', async () => {
      const { svc, filas } = escenario();
      const medias = { ...CRIBAJE_13, itemF: 2, itemG: 1, itemH: 1, itemK: 0.5 };
      const vista = await svc.calcular(1, dto(medias));
      expect(vista).toMatchObject({
        subtotalCribaje: 13,
        subtotalEvaluacion: null,
        evaluacionGlobal: null,
        interpretacionGlobal: null,
        segundaParte: { requerida: false, completa: false, itemsFaltantes: ['itemI', 'itemJ', 'itemL', 'itemM', 'itemN', 'itemO', 'itemP', 'itemQ', 'itemR'] },
      });
      expect(await erroresDe(svc.crear(1, dto(medias), USUARIO))).toEqual([
        'La segunda parte (ítems G a R) se envía completa o no se envía: faltan itemI, itemJ, itemL, itemM, itemN, itemO, itemP, itemQ, itemR',
      ]);
      expect(filas()).toHaveLength(0);
    });

    it('cribaje 9 con G–R a medias: tampoco es error (requerida=true, completa=false); un ítem en null cuenta como faltante', async () => {
      const { svc } = escenario();
      const vista = await svc.calcular(1, dto({ ...CRIBAJE_9, itemF: 2, itemG: 1, itemH: null }));
      expect(vista.segundaParte).toEqual({ requerida: true, completa: false, itemsFaltantes: TODOS_G_R.filter((c) => c !== 'itemG') });
      expect(vista.subtotalEvaluacion).toBeNull();
    });

    it('cribaje 13 con G–R completo: calcula evaluación, global e interpretación (la segunda parte es opcional pero válida)', async () => {
      const { svc } = escenario();
      expect(await svc.calcular(1, dto({ ...CRIBAJE_13, itemF: 3, ...EVALUACION_16 }))).toMatchObject({
        subtotalCribaje: 14,
        subtotalEvaluacion: 16,
        evaluacionGlobal: 30,
        interpretacionGlobal: 'Estado nutricional normal',
        segundaParte: { requerida: false, completa: true, itemsFaltantes: [] },
      });
    });

    it('con control vinculado deriva el ítem F y devuelve el cribaje aunque no haya G–R', async () => {
      const { svc, control } = escenario();
      control({ id: 7, imc: 22.4 });
      expect(await svc.calcular(1, dto({ ...CRIBAJE_13, controlNutricionalId: 7 }))).toMatchObject({
        itemF: 2,
        subtotalCribaje: 13,
        segundaParte: { requerida: false, completa: false },
      });
      expect(await svc.calcular(1, dto({ ...CRIBAJE_9, controlNutricionalId: 7 }))).toMatchObject({ itemF: 2, subtotalCribaje: 9, segundaParte: { requerida: true, completa: false } });
    });

    it('NO toma candados: ni el del control ni el de ninguna fila', async () => {
      const { svc, db, control } = escenario();
      control({ id: 7 });
      await svc.calcular(1, dto({ ...CRIBAJE_13, ...EVALUACION_16, controlNutricionalId: 7 }));
      await svc.calcular(1, dto({ ...CRIBAJE_9, controlNutricionalId: 7 }));
      expect(db.log.filter((l) => l.startsWith('lock'))).toEqual([]);
    });

    describe('siguen siendo 400 { errores } (los mismos textos y el mismo formato que el registro)', () => {
      it.each([
        ['control de otro expediente', { control: { expedienteId: 2 }, extra: {} }],
        ['control anulado', { control: { anulado: true }, extra: {} }],
        ['control posterior a la fecha de la evaluación', { control: { fecha: '2026-10-25' }, extra: { fecha: '2026-10-10' } }],
        ['itemF manual distinto del IMC del control', { control: { imc: 25.3 }, extra: { itemF: 0 } }],
      ])('%s', async (_nombre, { control: parcial, extra }) => {
        const { svc, control } = escenario();
        control({ id: 7, ...parcial });
        const cuerpo = { ...CRIBAJE_13, ...EVALUACION_16, controlNutricionalId: 7, ...extra };
        const preview = await erroresDe(svc.calcular(1, dto(cuerpo)));
        expect(preview.length).toBe(1);
        expect(preview).toEqual(await erroresDe(svc.crear(1, dto(cuerpo), USUARIO)));
      });

      it('textos exactos del vínculo y del ítem F', async () => {
        const { svc, control } = escenario();
        control({ id: 7, expedienteId: 2 });
        control({ id: 8, anulado: true });
        control({ id: 9, fecha: '2026-10-25' });
        control({ id: 10, imc: 25.3 });
        const base = { ...CRIBAJE_13, ...EVALUACION_16 };
        expect(await erroresDe(svc.calcular(1, dto({ ...base, controlNutricionalId: 7 })))).toEqual(['controlNutricionalId 7 no pertenece a este expediente']);
        expect(await erroresDe(svc.calcular(1, dto({ ...base, controlNutricionalId: 8 })))).toEqual(['controlNutricionalId 8 está anulado']);
        expect(await erroresDe(svc.calcular(1, dto({ ...base, controlNutricionalId: 9, fecha: '2026-10-10' })))).toEqual([
          'controlNutricionalId 9 es del 2026-10-25, posterior a la fecha de la evaluación (2026-10-10)',
        ]);
        expect(await erroresDe(svc.calcular(1, dto({ ...base, controlNutricionalId: 99 })))).toEqual(['controlNutricionalId 99 no existe']);
        expect(await erroresDe(svc.calcular(1, dto({ ...base, itemF: 1, controlNutricionalId: 10 })))).toEqual([
          'itemF no coincide con el IMC del control vinculado: IMC 25.3 ⇒ itemF 3',
        ]);
      });

      it('sin itemF ni vínculo, fecha futura y 404 del expediente', async () => {
        const { svc } = escenario();
        expect(await erroresDe(svc.calcular(1, dto({ ...CRIBAJE_13 })))).toEqual(['itemF es obligatorio cuando no se vincula un control nutricional']);
        expect(await erroresDe(svc.calcular(1, dto({ ...CA16, fecha: '2999-01-01' })))).toEqual(['La fecha de la evaluación no puede ser posterior a hoy']);
        await expect(svc.calcular(99, dto(CA16))).rejects.toBeInstanceOf(NotFoundException);
      });

      it('con un vínculo inválido no se informa la segunda parte ni se evalúa el ítem F (un solo error)', async () => {
        const { svc } = escenario();
        expect(await erroresDe(svc.calcular(1, dto({ ...CRIBAJE_9, controlNutricionalId: 99 })))).toEqual(['controlNutricionalId 99 no existe']);
      });
    });

    it('control ya vinculado a una evaluación activa ⇒ el mismo 409 informativo que el registro (sin candado); anulada la evaluación, vuelve a calcular', async () => {
      const { svc, control } = escenario();
      control({ id: 7 });
      const cuerpo = dto({ ...CRIBAJE_13, ...EVALUACION_16, controlNutricionalId: 7 });
      const primera = await svc.crear(1, cuerpo, USUARIO);
      const e = await svc.calcular(1, cuerpo).catch((x: unknown) => x);
      expect(e).toBeInstanceOf(ConflictException);
      expect((e as ConflictException).message).toBe(`El control nutricional 7 ya está vinculado a la evaluación MNA ${primera.id}`);
      await svc.anular(primera.id, 'Error', USUARIO);
      await expect(svc.calcular(1, cuerpo)).resolves.toMatchObject({ itemF: 3, subtotalCribaje: 14 });
    });

    it('la regla de la segunda parte es la MISMA en ambos caminos: lo que la vista previa marca válido, el registro lo guarda con el mismo global', async () => {
      const { svc } = escenario();
      for (const cuerpo of [CA16, { ...CRIBAJE_13, itemF: 3, ...EVALUACION_16 }, { ...CRIBAJE_13, itemF: 2 }]) {
        const vista = await svc.calcular(1, dto(cuerpo));
        const registrado = await svc.crear(1, dto(cuerpo), USUARIO);
        expect(registrado.evaluacionGlobal).toBe(vista.evaluacionGlobal);
        expect(vista.segundaParte.completa || !vista.segundaParte.requerida).toBe(true);
      }
    });
  });

  describe('listar', () => {
    it('expediente inexistente ⇒ 404; rango inválido ⇒ 400; sin evaluaciones ⇒ []', async () => {
      const { svc } = escenario();
      await expect(svc.listar(99, {})).rejects.toBeInstanceOf(NotFoundException);
      expect(await erroresDe(svc.listar(1, { desde: '2026-10-22', hasta: '2026-10-21' }))).toEqual(['desde no puede ser posterior a hasta']);
      await expect(svc.listar(1, {})).resolves.toEqual([]);
    });

    it('más reciente primero; desde/hasta inclusivos; solo las del expediente; excluye anuladas salvo incluirAnulados', async () => {
      const { svc } = escenario();
      const a = await svc.crear(1, dto({ ...CA16, fecha: '2026-01-10' }), USUARIO);
      const b = await svc.crear(1, dto({ ...CA16, fecha: '2026-04-21' }), USUARIO);
      const c = await svc.crear(1, dto({ ...CA16, fecha: '2026-10-01' }), USUARIO);
      await svc.crear(2, dto({ ...CA16, fecha: '2026-04-21' }), USUARIO);
      expect((await svc.listar(1, {})).map((e) => e.id)).toEqual([c.id, b.id, a.id]);
      expect((await svc.listar(1, { desde: '2026-04-21', hasta: '2026-04-21' })).map((e) => e.id)).toEqual([b.id]);
      await svc.anular(c.id, 'Error', 11);
      expect((await svc.listar(1, {})).map((e) => e.id)).toEqual([b.id, a.id]);
      expect((await svc.listar(1, { incluirAnulados: true })).map((e) => e.id)).toEqual([c.id, b.id, a.id]);
    });
  });

  describe('anular', () => {
    it('anula con motivo, usuario y fecha, sin tocar lo calculado; toma el candado de la fila', async () => {
      const { svc, db } = escenario();
      const e = await svc.crear(1, dto(CA16), USUARIO);
      const r = await svc.anular(e.id, 'Se evaluó al residente equivocado', 11);
      expect(r).toMatchObject({ anulado: true, motivoAnulacion: 'Se evaluó al residente equivocado', anuladoPorId: 11, modificadoPorId: 11, evaluacionGlobal: 21.5, itemK: 0.5 });
      expect(r.fechaAnulacion).toBeInstanceOf(Date);
      expect(db.log).toContain(`lock:EvaluacionMna:${e.id}`);
    });

    it('inexistente ⇒ 404; ya anulada ⇒ 409 y se conserva la anulación original', async () => {
      const { svc } = escenario();
      await expect(svc.anular(99, 'x', 11)).rejects.toThrow('Evaluación MNA 99 no existe');
      const e = await svc.crear(1, dto(CA16), USUARIO);
      await svc.anular(e.id, 'primera', 11);
      await expect(svc.anular(e.id, 'segunda', 12)).rejects.toThrow('La evaluación MNA ya está anulada');
      const [anulada] = await svc.listar(1, { incluirAnulados: true });
      expect(anulada).toMatchObject({ motivoAnulacion: 'primera', anuladoPorId: 11 });
    });
  });
});
