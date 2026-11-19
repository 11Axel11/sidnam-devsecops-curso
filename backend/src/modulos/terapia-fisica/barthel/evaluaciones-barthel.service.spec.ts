/* eslint-disable @typescript-eslint/no-unsafe-argument -- base simulada en memoria */
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { generarTextoLargo } from 'src/common/testing/texto-largo.helper';
import { EvaluacionBarthel } from '../entities/evaluacion-barthel.entity';
import { crearDbSimulada } from '../valoraciones/testing/db-simulada';
import { ItemsBarthel } from './barthel-v1.instrumento';
import { EvaluacionesBarthelService } from './evaluaciones-barthel.service';

/**
 * Servicio de Barthel contra la base simulada. Expedientes 1 y 2. «Hoy» = 2026-10-21 (18:00 en Costa Rica =
 * 2026-10-22T00:00Z, para comprobar que el día por defecto es el de Costa Rica y no el de UTC).
 */
const HOY = '2026-10-21';
const AHORA = new Date('2026-10-22T00:00:00.000Z');
const USUARIO = 9;

const MAXIMO: ItemsBarthel = {
  comer: 10, lavarse: 5, vestirse: 10, arreglarse: 5, deposiciones: 10,
  miccion: 10, usarRetrete: 10, trasladarse: 15, deambular: 15, escalones: 10,
};
const con = (c: Partial<ItemsBarthel>): ItemsBarthel => ({ ...MAXIMO, ...c });

const escenario = () => {
  const db = crearDbSimulada([1, 2]);
  const svc = new EvaluacionesBarthelService(db.dataSource);
  const filas = () => db.filas(EvaluacionBarthel) as EvaluacionBarthel[];
  const evaluacion = (parcial: Partial<EvaluacionBarthel> & { fecha: string }) =>
    db.insertar(EvaluacionBarthel, { expedienteId: 1, ...MAXIMO, puntajeTotal: 100, gradoDependencia: 'Independencia', versionInstrumento: 'Barthel-v1', anulado: false, ...parcial });
  return { db, svc, filas, evaluacion };
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

describe('EvaluacionesBarthelService', () => {
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
    it('la respuesta incluye lo calculado: total, grado y versión; fecha de hoy (Costa Rica) y examinador del token', async () => {
      const { svc } = escenario();
      const e = await svc.crear(1, { ...MAXIMO }, USUARIO);
      expect(e).toMatchObject({
        expedienteId: 1,
        fecha: HOY,
        usuarioExaminadorId: USUARIO,
        creadoPorId: USUARIO,
        puntajeTotal: 100,
        gradoDependencia: 'Independencia',
        versionInstrumento: 'Barthel-v1',
        observaciones: null,
        anulado: false,
        ...MAXIMO,
      });
    });

    it('CA-08 con la tabla vigente: suma 45 ⇒ «Dependencia Severa»', async () => {
      const { svc } = escenario();
      const e = await svc.crear(1, { comer: 10, lavarse: 0, vestirse: 10, arreglarse: 5, deposiciones: 10, miccion: 10, usarRetrete: 0, trasladarse: 0, deambular: 0, escalones: 0 }, USUARIO);
      expect(e).toMatchObject({ puntajeTotal: 45, gradoDependencia: 'Dependencia Severa' });
    });

    it('silla de ruedas: total 90 y deambular = 5 ⇒ «Independencia — uso de silla de ruedas»', async () => {
      const { svc } = escenario();
      const e = await svc.crear(1, con({ deambular: 5 }), USUARIO);
      expect(e).toMatchObject({ puntajeTotal: 90, gradoDependencia: 'Independencia — uso de silla de ruedas' });
    });

    it('90 sin silla de ruedas ⇒ «Dependencia Moderada»', async () => {
      const { svc } = escenario();
      expect(await svc.crear(1, con({ escalones: 0 }), USUARIO)).toMatchObject({ puntajeTotal: 90, gradoDependencia: 'Dependencia Moderada' });
    });

    it('mínimo (0) y máximo (100)', async () => {
      const { svc } = escenario();
      const cero = Object.fromEntries(Object.keys(MAXIMO).map((k) => [k, 0])) as ItemsBarthel;
      expect(await svc.crear(1, cero, USUARIO)).toMatchObject({ puntajeTotal: 0, gradoDependencia: 'Dependencia Total' });
      expect(await svc.crear(1, MAXIMO, USUARIO)).toMatchObject({ puntajeTotal: 100, gradoDependencia: 'Independencia' });
    });

    it('lo calculado NUNCA se acepta del cliente: aunque llegue en el objeto, se ignora y se recalcula', async () => {
      const { svc } = escenario();
      const malicioso = { ...con({ comer: 0 }), puntajeTotal: 100, gradoDependencia: 'Independencia', versionInstrumento: 'Barthel-v9', usuarioExaminadorId: 500, expedienteId: 2, anulado: true, creadoPorId: 500 };
      const e = await svc.crear(1, malicioso as never, USUARIO);
      expect(e).toMatchObject({ puntajeTotal: 90, gradoDependencia: 'Dependencia Moderada', versionInstrumento: 'Barthel-v1', usuarioExaminadorId: USUARIO, expedienteId: 1, anulado: false, creadoPorId: USUARIO });
    });

    it('guarda observaciones largas (> 2000 caracteres) sin fragmentar', async () => {
      const { svc } = escenario();
      const largo = generarTextoLargo(5000);
      expect((await svc.crear(1, { ...MAXIMO, observaciones: largo }, USUARIO)).observaciones).toBe(largo);
    });

    it('acepta una fecha pasada y rechaza la futura o inexistente (400, nada se guarda)', async () => {
      const { svc, filas } = escenario();
      await expect(svc.crear(1, { ...MAXIMO, fecha: '2026-04-21' }, USUARIO)).resolves.toMatchObject({ fecha: '2026-04-21' });
      expect(await erroresDe(svc.crear(1, { ...MAXIMO, fecha: '2026-10-22' }, USUARIO))).toEqual(['La fecha de la evaluación no puede ser posterior a hoy']);
      expect(await erroresDe(svc.crear(1, { ...MAXIMO, fecha: '2026-02-30' }, USUARIO))).toEqual(['La fecha de la evaluación no es una fecha válida (formato YYYY-MM-DD)']);
      expect(filas()).toHaveLength(1);
    });

    it('expediente inexistente ⇒ 404 y no se crea nada (RN-01)', async () => {
      const { svc, filas } = escenario();
      await expect(svc.crear(99, MAXIMO, USUARIO)).rejects.toBeInstanceOf(NotFoundException);
      expect(filas()).toHaveLength(0);
    });

    it('un residente puede tener muchas evaluaciones, incluso el mismo día: ninguna sobrescribe a otra (RN-02)', async () => {
      const { svc, filas } = escenario();
      await svc.crear(1, MAXIMO, USUARIO);
      await svc.crear(1, con({ comer: 0 }), USUARIO);
      await svc.crear(1, con({ comer: 5 }), USUARIO);
      expect(filas().map((f) => f.puntajeTotal)).toEqual([100, 90, 95]);
    });
  });

  describe('listar', () => {
    it('expediente inexistente ⇒ 404; rango inválido ⇒ 400; sin evaluaciones ⇒ []', async () => {
      const { svc } = escenario();
      await expect(svc.listar(99, {})).rejects.toBeInstanceOf(NotFoundException);
      expect(await erroresDe(svc.listar(1, { desde: '2026-10-22', hasta: '2026-10-21' }))).toEqual(['desde no puede ser posterior a hasta']);
      await expect(svc.listar(1, {})).resolves.toEqual([]);
    });

    it('de la más reciente a la más antigua; mismo día: la última registrada primero', async () => {
      const { svc, evaluacion } = escenario();
      evaluacion({ id: 1, fecha: '2026-01-10' });
      evaluacion({ id: 2, fecha: '2026-10-01' });
      evaluacion({ id: 3, fecha: '2026-10-01' });
      expect((await svc.listar(1, {})).map((e) => e.id)).toEqual([3, 2, 1]);
    });

    it('desde/hasta inclusivos; solo las del expediente pedido', async () => {
      const { svc, evaluacion } = escenario();
      evaluacion({ id: 1, fecha: '2026-01-10' });
      evaluacion({ id: 2, fecha: '2026-04-21' });
      evaluacion({ id: 3, fecha: '2026-10-01' });
      evaluacion({ id: 4, fecha: '2026-04-21', expedienteId: 2 });
      expect((await svc.listar(1, { desde: '2026-04-21', hasta: '2026-04-21' })).map((e) => e.id)).toEqual([2]);
      expect((await svc.listar(1, { desde: '2026-04-21' })).map((e) => e.id)).toEqual([3, 2]);
      expect((await svc.listar(1, { hasta: '2026-01-10' })).map((e) => e.id)).toEqual([1]);
    });

    it('por defecto EXCLUYE las anuladas; con incluirAnulados=true las trae', async () => {
      const { svc, evaluacion } = escenario();
      evaluacion({ id: 1, fecha: '2026-01-10' });
      evaluacion({ id: 2, fecha: '2026-02-10', anulado: true });
      expect((await svc.listar(1, {})).map((e) => e.id)).toEqual([1]);
      expect((await svc.listar(1, { incluirAnulados: true })).map((e) => e.id)).toEqual([2, 1]);
    });

    it('nunca recalcula: devuelve el total y el grado almacenados (otra versión del instrumento) tal cual', async () => {
      const { svc, evaluacion } = escenario();
      evaluacion({ id: 1, fecha: '2026-01-10', puntajeTotal: 42, gradoDependencia: 'Moderado', versionInstrumento: 'Barthel-v0' });
      expect((await svc.listar(1, {}))[0]).toMatchObject({ puntajeTotal: 42, gradoDependencia: 'Moderado', versionInstrumento: 'Barthel-v0' });
    });
  });

  describe('anular', () => {
    it('anula con motivo, usuario y fecha, sin tocar lo calculado; toma el candado de la fila', async () => {
      const { svc, db } = escenario();
      const e = await svc.crear(1, MAXIMO, USUARIO);
      const r = await svc.anular(e.id, 'Se evaluó al residente equivocado', 11);
      expect(r).toMatchObject({ anulado: true, motivoAnulacion: 'Se evaluó al residente equivocado', anuladoPorId: 11, modificadoPorId: 11, puntajeTotal: 100, gradoDependencia: 'Independencia' });
      expect(r.fechaAnulacion).toBeInstanceOf(Date);
      expect(db.log).toContain(`lock:EvaluacionBarthel:${e.id}`);
    });

    it('inexistente ⇒ 404; ya anulada ⇒ 409 y se conserva la anulación original', async () => {
      const { svc } = escenario();
      await expect(svc.anular(99, 'x', 11)).rejects.toThrow('Evaluación de Barthel 99 no existe');
      const e = await svc.crear(1, MAXIMO, USUARIO);
      await svc.anular(e.id, 'primera', 11);
      await expect(svc.anular(e.id, 'segunda', 12)).rejects.toBeInstanceOf(ConflictException);
      const [anulada] = await svc.listar(1, { incluirAnulados: true });
      expect(anulada).toMatchObject({ motivoAnulacion: 'primera', anuladoPorId: 11 });
    });
  });
});
