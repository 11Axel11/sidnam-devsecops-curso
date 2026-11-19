/* eslint-disable @typescript-eslint/no-unsafe-argument -- base simulada en memoria */
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { generarTextoLargo } from 'src/common/testing/texto-largo.helper';
import { maximoDeItem } from 'src/common/valoraciones/instrumento';
import { EvaluacionTinetti } from '../entities/evaluacion-tinetti.entity';
import { crearDbSimulada } from '../valoraciones/testing/db-simulada';
import { EvaluacionesTinettiService } from './evaluaciones-tinetti.service';
import { ITEMS_TINETTI_V1, ItemsTinetti } from './tinetti-v1.instrumento';

/**
 * Servicio de Tinetti contra la base simulada. Expedientes: 1 (residente nacido 1940-05-12), 2 (nacido
 * 1935-11-27, leído como lo devuelve el driver: medianoche UTC), 3 (sin residente). «Hoy» = 2026-10-21 (18:00 en
 * Costa Rica = 2026-10-22T00:00Z, para comprobar que el día por defecto es el de Costa Rica y no el de UTC).
 */
const HOY = '2026-10-21';
const AHORA = new Date('2026-10-22T00:00:00.000Z');
const USUARIO = 9;

const MAXIMO = Object.fromEntries(ITEMS_TINETTI_V1.map((i) => [i.campo, maximoDeItem(i)])) as ItemsTinetti;
const CERO = Object.fromEntries(ITEMS_TINETTI_V1.map((i) => [i.campo, 0])) as ItemsTinetti;

const escenario = () => {
  const db = crearDbSimulada([1, 2, 3], { 2: new Date('1935-11-27T00:00:00.000Z'), 3: null });
  const svc = new EvaluacionesTinettiService(db.dataSource);
  const filas = () => db.filas(EvaluacionTinetti) as EvaluacionTinetti[];
  const evaluacion = (parcial: Partial<EvaluacionTinetti> & { fecha: string }) =>
    db.insertar(EvaluacionTinetti, { expedienteId: 1, numeroControl: 1, ...MAXIMO, puntajeEquilibrio: 16, puntajeMarcha: 12, puntajeTotal: 28, riesgoCaida: 'Riesgo bajo o leve', versionInstrumento: 'Tinetti-v1', edadMomentoEvaluacion: 86, anulado: false, ...parcial });
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

describe('EvaluacionesTinettiService', () => {
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
    it('la respuesta incluye lo calculado: subtotales, total, riesgo, versión, edad y número de control', async () => {
      const { svc } = escenario();
      const e = await svc.crear(1, { ...MAXIMO }, USUARIO);
      expect(e).toMatchObject({
        expedienteId: 1,
        fecha: HOY,
        usuarioExaminadorId: USUARIO,
        creadoPorId: USUARIO,
        edadMomentoEvaluacion: 86,
        numeroControl: 1,
        puntajeEquilibrio: 16,
        puntajeMarcha: 12,
        puntajeTotal: 28,
        riesgoCaida: 'Riesgo bajo o leve',
        versionInstrumento: 'Tinetti-v1',
        observaciones: null,
        anulado: false,
        ...MAXIMO,
      });
    });

    it('mínimo (0 ⇒ riesgo alto) y los tres puntajes se calculan con la tabla vigente', async () => {
      const { svc } = escenario();
      expect(await svc.crear(1, CERO, USUARIO)).toMatchObject({ puntajeEquilibrio: 0, puntajeMarcha: 0, puntajeTotal: 0, riesgoCaida: 'Riesgo alto de caídas' });
      const medio = { ...MAXIMO, posturaMarcha: 0, trayectoria: 0, tronco: 0, sentarse: 0 }; // 28 − 1 − 2 − 2 − 2 = 21
      expect(await svc.crear(1, medio, USUARIO)).toMatchObject({ puntajeEquilibrio: 14, puntajeMarcha: 7, puntajeTotal: 21, riesgoCaida: 'Riesgo de caídas' });
    });

    it('lo calculado NUNCA se acepta del cliente: aunque llegue en el objeto, se ignora y se recalcula', async () => {
      const { svc } = escenario();
      const malicioso = { ...CERO, puntajeTotal: 28, puntajeEquilibrio: 16, puntajeMarcha: 12, riesgoCaida: 'Riesgo bajo o leve', versionInstrumento: 'Tinetti-v9', numeroControl: 77, edadMomentoEvaluacion: 1, usuarioExaminadorId: 500, expedienteId: 2, anulado: true, creadoPorId: 500 };
      const e = await svc.crear(1, malicioso as never, USUARIO);
      expect(e).toMatchObject({ puntajeTotal: 0, riesgoCaida: 'Riesgo alto de caídas', versionInstrumento: 'Tinetti-v1', numeroControl: 1, edadMomentoEvaluacion: 86, usuarioExaminadorId: USUARIO, expedienteId: 1, anulado: false, creadoPorId: USUARIO });
    });

    it('la edad se calcula a la FECHA de la evaluación (no a hoy) desde la fecha de nacimiento, no desde residente.edad', async () => {
      const { svc } = escenario();
      // nacido 1940-05-12: víspera del cumpleaños 85, el día, y hoy
      expect((await svc.crear(1, { ...MAXIMO, fecha: '2025-05-11' }, USUARIO)).edadMomentoEvaluacion).toBe(84);
      expect((await svc.crear(1, { ...MAXIMO, fecha: '2025-05-12' }, USUARIO)).edadMomentoEvaluacion).toBe(85);
      expect((await svc.crear(1, { ...MAXIMO, fecha: HOY }, USUARIO)).edadMomentoEvaluacion).toBe(86);
    });

    it('fecha de nacimiento guardada como la guarda la app (medianoche UTC leída con -06:00) y cumpleaños en la frontera', async () => {
      const { svc } = escenario();
      // expediente 2: fila «1935-11-26 18:00:00», leída 1935-11-27T00:00:00Z ⇒ nació el 27 de noviembre
      expect((await svc.crear(2, { ...MAXIMO, fecha: '2025-11-26' }, USUARIO)).edadMomentoEvaluacion).toBe(89);
      expect((await svc.crear(2, { ...MAXIMO, fecha: '2025-11-27' }, USUARIO)).edadMomentoEvaluacion).toBe(90);
      expect((await svc.crear(2, { ...MAXIMO, fecha: '2025-11-28' }, USUARIO)).edadMomentoEvaluacion).toBe(90);
    });

    it('guarda observaciones largas (> 2000 caracteres) sin fragmentar', async () => {
      const { svc } = escenario();
      const largo = generarTextoLargo(5000);
      expect((await svc.crear(1, { ...MAXIMO, observaciones: largo }, USUARIO)).observaciones).toBe(largo);
    });

    it('fecha futura, inexistente o anterior al nacimiento ⇒ 400 y nada se guarda', async () => {
      const { svc, filas } = escenario();
      expect(await erroresDe(svc.crear(1, { ...MAXIMO, fecha: '2026-10-22' }, USUARIO))).toEqual(['La fecha de la evaluación no puede ser posterior a hoy']);
      expect(await erroresDe(svc.crear(1, { ...MAXIMO, fecha: '2026-02-30' }, USUARIO))).toEqual(['La fecha de la evaluación no es una fecha válida (formato YYYY-MM-DD)']);
      expect(await erroresDe(svc.crear(2, { ...MAXIMO, fecha: '1935-11-26' }, USUARIO))).toEqual([
        'La fecha de la evaluación no puede ser anterior a la fecha de nacimiento del residente',
      ]);
      expect(filas()).toHaveLength(0);
    });

    it('expediente inexistente ⇒ 404 y no se crea nada (RN-01); sin residente ⇒ 409 (no se inventa la edad)', async () => {
      const { svc, filas } = escenario();
      await expect(svc.crear(99, MAXIMO, USUARIO)).rejects.toBeInstanceOf(NotFoundException);
      await expect(svc.crear(3, MAXIMO, USUARIO)).rejects.toBeInstanceOf(ConflictException);
      expect(filas()).toHaveLength(0);
    });
  });

  describe('numeroControl: consecutivo por expediente', () => {
    it('1, 2, 3… por expediente; cada expediente tiene su propia numeración', async () => {
      const { svc } = escenario();
      expect((await svc.crear(1, MAXIMO, USUARIO)).numeroControl).toBe(1);
      expect((await svc.crear(1, MAXIMO, USUARIO)).numeroControl).toBe(2);
      expect((await svc.crear(2, MAXIMO, USUARIO)).numeroControl).toBe(1);
      expect((await svc.crear(1, MAXIMO, USUARIO)).numeroControl).toBe(3);
      expect((await svc.crear(2, MAXIMO, USUARIO)).numeroControl).toBe(2);
    });

    it('un número NUNCA se reutiliza: anular no libera el número', async () => {
      const { svc } = escenario();
      await svc.crear(1, MAXIMO, USUARIO);
      const segunda = await svc.crear(1, MAXIMO, USUARIO);
      await svc.anular(segunda.id, 'Error', 11);
      expect((await svc.crear(1, MAXIMO, USUARIO)).numeroControl).toBe(3);
      // la lista por defecto muestra el salto (1 y 3); con incluirAnulados aparece el 2
      expect((await svc.listar(1, {})).map((e) => e.numeroControl)).toEqual([3, 1]);
      expect((await svc.listar(1, { incluirAnulados: true })).map((e) => e.numeroControl).sort()).toEqual([1, 2, 3]);
    });

    it('continúa desde el máximo existente (incluidas las anuladas)', async () => {
      const { svc, evaluacion } = escenario();
      evaluacion({ id: 1, fecha: '2026-01-10', numeroControl: 4, anulado: true });
      expect((await svc.crear(1, MAXIMO, USUARIO)).numeroControl).toBe(5);
    });

    it('toma el candado FOR UPDATE del expediente antes de calcular el número (serializa los registros simultáneos)', async () => {
      const { svc, db } = escenario();
      await svc.crear(1, MAXIMO, USUARIO);
      expect(db.log).toContain('lock-expediente:1');
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
      evaluacion({ id: 1, fecha: '2026-01-10', numeroControl: 1 });
      evaluacion({ id: 2, fecha: '2026-10-01', numeroControl: 2 });
      evaluacion({ id: 3, fecha: '2026-10-01', numeroControl: 3 });
      expect((await svc.listar(1, {})).map((e) => e.id)).toEqual([3, 2, 1]);
    });

    it('desde/hasta inclusivos; solo las del expediente pedido; excluye anuladas salvo incluirAnulados', async () => {
      const { svc, evaluacion } = escenario();
      evaluacion({ id: 1, fecha: '2026-01-10', numeroControl: 1 });
      evaluacion({ id: 2, fecha: '2026-04-21', numeroControl: 2 });
      evaluacion({ id: 3, fecha: '2026-10-01', numeroControl: 3, anulado: true });
      evaluacion({ id: 4, fecha: '2026-04-21', expedienteId: 2 });
      expect((await svc.listar(1, { desde: '2026-04-21', hasta: '2026-04-21' })).map((e) => e.id)).toEqual([2]);
      expect((await svc.listar(1, {})).map((e) => e.id)).toEqual([2, 1]);
      expect((await svc.listar(1, { incluirAnulados: true })).map((e) => e.id)).toEqual([3, 2, 1]);
    });

    it('nunca recalcula: devuelve lo almacenado (otra versión del instrumento) tal cual', async () => {
      const { svc, evaluacion } = escenario();
      evaluacion({ id: 1, fecha: '2026-01-10', puntajeTotal: 11, riesgoCaida: 'Alto', versionInstrumento: 'Tinetti-v0', edadMomentoEvaluacion: 70 });
      expect((await svc.listar(1, {}))[0]).toMatchObject({ puntajeTotal: 11, riesgoCaida: 'Alto', versionInstrumento: 'Tinetti-v0', edadMomentoEvaluacion: 70 });
    });
  });

  describe('anular', () => {
    it('anula con motivo, usuario y fecha, sin tocar lo calculado; toma el candado de la fila', async () => {
      const { svc, db } = escenario();
      const e = await svc.crear(1, MAXIMO, USUARIO);
      const r = await svc.anular(e.id, 'Se evaluó al residente equivocado', 11);
      expect(r).toMatchObject({ anulado: true, motivoAnulacion: 'Se evaluó al residente equivocado', anuladoPorId: 11, modificadoPorId: 11, puntajeTotal: 28, numeroControl: 1, edadMomentoEvaluacion: 86 });
      expect(r.fechaAnulacion).toBeInstanceOf(Date);
      expect(db.log).toContain(`lock:EvaluacionTinetti:${e.id}`);
    });

    it('inexistente ⇒ 404; ya anulada ⇒ 409 y se conserva la anulación original', async () => {
      const { svc } = escenario();
      await expect(svc.anular(99, 'x', 11)).rejects.toThrow('Evaluación de Tinetti 99 no existe');
      const e = await svc.crear(1, MAXIMO, USUARIO);
      await svc.anular(e.id, 'primera', 11);
      await expect(svc.anular(e.id, 'segunda', 12)).rejects.toThrow('La evaluación de Tinetti ya está anulada');
      const [anulada] = await svc.listar(1, { incluirAnulados: true });
      expect(anulada).toMatchObject({ motivoAnulacion: 'primera', anuladoPorId: 11 });
    });
  });
});
