/* eslint-disable @typescript-eslint/no-unsafe-assignment -- prueba contra MySQL real */
import 'reflect-metadata';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { generarTextoLargo } from 'src/common/testing/texto-largo.helper';
import { MAX_TEXTO_LIBRE } from 'src/common/validators/texto-libre.decorator';
import { maximoDeItem } from 'src/common/valoraciones/instrumento';
import { EvaluacionTinetti } from '../entities/evaluacion-tinetti.entity';
import {
  abrirDataSourceDeIntegracion,
  INTEGRACION_ACTIVA,
  nuevoExpediente,
  nuevoExpedienteConResidente,
} from '../valoraciones/testing/integracion';
import { EvaluacionesTinettiService } from './evaluaciones-tinetti.service';
import { ITEMS_TINETTI_V1, ItemsTinetti } from './tinetti-v1.instrumento';

/**
 * INTEGRACIÓN con MySQL REAL (opt-in; ver valoraciones/testing/integracion.ts) de la Escala de Tinetti: totales y
 * riesgo persistidos, edad con la fecha de nacimiento guardada como la guarda la app, número de control
 * consecutivo bajo concurrencia real, texto largo, anulación (incluida la simultánea) y esquema.
 *
 *   RUN_DB_INTEGRATION=1 DB_TEST_NAME=sidnam_scratch_b4 npx jest integration --runInBand
 *
 * Las suites de integración comparten la base y hacen `synchronize`: correrlas EN SERIE (--runInBand).
 */
const MAXIMO = Object.fromEntries(ITEMS_TINETTI_V1.map((i) => [i.campo, maximoDeItem(i)])) as ItemsTinetti;
const CERO = Object.fromEntries(ITEMS_TINETTI_V1.map((i) => [i.campo, 0])) as ItemsTinetti;

(INTEGRACION_ACTIVA ? describe : describe.skip)('Escala de Tinetti — integración MySQL', () => {
  jest.setTimeout(240_000);
  let ds: DataSource;
  let svc: EvaluacionesTinettiService;

  beforeAll(async () => {
    ds = await abrirDataSourceDeIntegracion();
    svc = new EvaluacionesTinettiService(ds);
  });

  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  const nacido1940 = () => nuevoExpedienteConResidente(ds, new Date('1940-05-12')); // como llega del frontend: medianoche UTC
  const leer = (id: number) => ds.getRepository(EvaluacionTinetti).findOneByOrFail({ id });
  const numeros = async (exp: number) =>
    (await ds.getRepository(EvaluacionTinetti).find({ where: { expedienteId: exp }, order: { numeroControl: 'ASC' } })).map((e) => e.numeroControl);

  describe('cálculo almacenado (RN-04/06/09/10)', () => {
    it('CA-09 de punta a punta: veinte ítems ⇒ equilibrio, marcha, total y riesgo persistidos con la versión', async () => {
      const exp = await nacido1940();
      const e = await svc.crear(exp, { ...MAXIMO, fecha: '2026-10-21', observaciones: 'Usa bastón' }, 7);
      const g = await leer(e.id);
      expect(g).toMatchObject({
        expedienteId: exp, fecha: '2026-10-21', usuarioExaminadorId: 7, creadoPorId: 7, edadMomentoEvaluacion: 86, numeroControl: 1,
        puntajeEquilibrio: 16, puntajeMarcha: 12, puntajeTotal: 28, riesgoCaida: 'Riesgo bajo o leve', versionInstrumento: 'Tinetti-v1',
        observaciones: 'Usa bastón', anulado: false, ...MAXIMO,
      });
      expect(typeof g.puntajeTotal).toBe('number');
    });

    it('los tres riesgos de la tabla confirmada persisten tal cual (0, 19 y 24)', async () => {
      const exp = await nacido1940();
      const marchaEn0 = { inicioMarcha: 0, longitudPasoDerecho: 0, alturaPasoDerecho: 0, longitudPasoIzquierdo: 0, alturaPasoIzquierdo: 0, simetriaPaso: 0, continuidadPasos: 0, trayectoria: 0, tronco: 0, posturaMarcha: 0 };
      const con19 = { ...MAXIMO, ...marchaEn0, inicioMarcha: 1, longitudPasoDerecho: 1, alturaPasoDerecho: 1 }; // equilibrio 16 + marcha 3 = 19
      const con24 = { ...MAXIMO, posturaMarcha: 0, tronco: 0, longitudPasoDerecho: 0 }; // 28 − 1 − 2 − 1 = 24
      const casos: [ItemsTinetti, number, string][] = [
        [CERO, 0, 'Riesgo alto de caídas'],
        [con19, 19, 'Riesgo de caídas'],
        [con24, 24, 'Riesgo bajo o leve'],
      ];
      for (const [items, total, riesgo] of casos) {
        const e = await svc.crear(exp, items, 7);
        expect(await leer(e.id)).toMatchObject({ puntajeTotal: total, riesgoCaida: riesgo });
      }
    });

    it('lo guardado no cambia al volver a leer la fila (nunca se recalcula)', async () => {
      const exp = await nacido1940();
      const e = await svc.crear(exp, MAXIMO, 7);
      await ds.query("UPDATE evaluacion_tinetti SET puntajeTotal = 11, riesgoCaida = 'Alto', versionInstrumento = 'Tinetti-v0', edadMomentoEvaluacion = 70 WHERE id = ?", [e.id]);
      expect((await svc.listar(exp, {}))[0]).toMatchObject({ puntajeTotal: 11, riesgoCaida: 'Alto', versionInstrumento: 'Tinetti-v0', edadMomentoEvaluacion: 70 });
    });
  });

  describe('edad con la fecha de nacimiento guardada COMO LA GUARDA LA APP', () => {
    it('medianoche UTC escrita por el driver (-06:00) como «día anterior 18:00»: cumpleaños en la frontera', async () => {
      const exp = await nuevoExpedienteConResidente(ds, new Date('1935-11-27'));
      const [{ raw }] = await ds.query(
        `SELECT CAST(r.fecha_nacimiento AS CHAR) AS raw FROM residente r
           JOIN expediente_residente e ON e.residenteIdAdultoMayor = r.id_adulto_mayor WHERE e.id_expediente = ?`,
        [exp],
      );
      expect(raw).toBe('1935-11-26 18:00:00');
      expect((await svc.crear(exp, { ...MAXIMO, fecha: '2025-11-26' }, 7)).edadMomentoEvaluacion).toBe(89);
      expect((await svc.crear(exp, { ...MAXIMO, fecha: '2025-11-27' }, 7)).edadMomentoEvaluacion).toBe(90);
      expect((await svc.crear(exp, { ...MAXIMO, fecha: '2025-11-28' }, 7)).edadMomentoEvaluacion).toBe(90);
    });
  });

  describe('validaciones que dependen de la base', () => {
    it('expediente inexistente ⇒ 404 (crear y listar)', async () => {
      await expect(svc.crear(999_999_999, MAXIMO, 7)).rejects.toBeInstanceOf(NotFoundException);
      await expect(svc.listar(999_999_999, {})).rejects.toBeInstanceOf(NotFoundException);
    });

    it('expediente SIN residente ⇒ 409: no se inventa la edad ni se consume un número de control', async () => {
      const exp = await nuevoExpediente(ds);
      await expect(svc.crear(exp, MAXIMO, 7)).rejects.toBeInstanceOf(ConflictException);
      expect(await numeros(exp)).toEqual([]);
    });

    it('fecha futura o anterior al nacimiento ⇒ 400 y nada se guarda; sin fecha usa hoy (Costa Rica)', async () => {
      const exp = await nacido1940();
      await expect(svc.crear(exp, { ...MAXIMO, fecha: '2999-01-01' }, 7)).rejects.toBeInstanceOf(BadRequestException);
      await expect(svc.crear(exp, { ...MAXIMO, fecha: '1940-05-11' }, 7)).rejects.toBeInstanceOf(BadRequestException);
      expect(await numeros(exp)).toEqual([]);
      expect((await svc.crear(exp, MAXIMO, 7)).fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('numeroControl: consecutivo por expediente, sin huecos ni duplicados por concurrencia', () => {
    it('10 registros SIMULTÁNEOS del mismo expediente ⇒ 1..10 exactos (repetido 3 veces)', async () => {
      for (let ronda = 0; ronda < 3; ronda++) {
        const exp = await nacido1940();
        const r = await Promise.allSettled(Array.from({ length: 10 }, () => svc.crear(exp, MAXIMO, 7)));
        const rechazadas = r.filter((x): x is PromiseRejectedResult => x.status === 'rejected');
        expect(rechazadas.map((x) => String(x.reason))).toEqual([]); // ni deadlocks ni duplicados
        expect(await numeros(exp)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      }
    });

    it('expedientes DISTINTOS no se bloquean entre sí: cada uno empieza en 1', async () => {
      const exps = await Promise.all([nacido1940(), nacido1940(), nacido1940()]);
      await Promise.all(exps.flatMap((e) => [svc.crear(e, MAXIMO, 7), svc.crear(e, MAXIMO, 7)]));
      for (const e of exps) expect(await numeros(e)).toEqual([1, 2]);
    });

    it('anular no libera el número: la siguiente evaluación continúa la numeración', async () => {
      const exp = await nacido1940();
      await svc.crear(exp, MAXIMO, 7);
      const segunda = await svc.crear(exp, MAXIMO, 7);
      await svc.anular(segunda.id, 'Error', 8);
      expect((await svc.crear(exp, MAXIMO, 7)).numeroControl).toBe(3);
      expect(await numeros(exp)).toEqual([1, 2, 3]);
    });

    it('respaldo en la base: UNIQUE (expediente_id, numero_control) rechaza un número repetido', async () => {
      const exp = await nacido1940();
      const e = await svc.crear(exp, MAXIMO, 7);
      const copia = { ...(await leer(e.id)) } as Partial<EvaluacionTinetti>;
      delete copia.id;
      await expect(ds.getRepository(EvaluacionTinetti).insert(copia)).rejects.toThrow(/Duplicate entry/);
    });
  });

  describe('texto largo (CA-06): sin fragmentar', () => {
    it('observaciones de 2500 y de 20 000 caracteres vuelven idénticas', async () => {
      const exp = await nacido1940();
      for (const n of [2500, MAX_TEXTO_LIBRE]) {
        const texto = generarTextoLargo(n);
        const e = await svc.crear(exp, { ...MAXIMO, observaciones: texto }, 7);
        expect((await leer(e.id)).observaciones).toBe(texto);
      }
    });

    it('el motivo de anulación de 2000 caracteres vuelve idéntico', async () => {
      const exp = await nacido1940();
      const e = await svc.crear(exp, MAXIMO, 7);
      const motivo = generarTextoLargo(2000);
      await svc.anular(e.id, motivo, 8);
      expect((await leer(e.id)).motivoAnulacion).toBe(motivo);
    });
  });

  describe('serie y filtros', () => {
    it('más reciente primero, desde/hasta inclusivos y anuladas excluidas por defecto', async () => {
      const exp = await nacido1940();
      const a = await svc.crear(exp, { ...MAXIMO, fecha: '2026-01-10' }, 7);
      const b = await svc.crear(exp, { ...MAXIMO, fecha: '2026-04-21' }, 7);
      const c = await svc.crear(exp, { ...MAXIMO, fecha: '2026-10-01' }, 7);
      expect((await svc.listar(exp, {})).map((e) => e.id)).toEqual([c.id, b.id, a.id]);
      expect((await svc.listar(exp, { desde: '2026-01-10', hasta: '2026-04-21' })).map((e) => e.id)).toEqual([b.id, a.id]);
      await svc.anular(c.id, 'Error', 8);
      expect((await svc.listar(exp, {})).map((e) => e.id)).toEqual([b.id, a.id]);
      expect((await svc.listar(exp, { incluirAnulados: true })).map((e) => e.id)).toEqual([c.id, b.id, a.id]);
    });
  });

  describe('anulación (RN-02): nunca DELETE', () => {
    it('anula con motivo, usuario y fecha y deja la fila; segunda vez ⇒ 409', async () => {
      const exp = await nacido1940();
      const e = await svc.crear(exp, MAXIMO, 7);
      const r = await svc.anular(e.id, 'Residente equivocado', 8);
      expect(r).toMatchObject({ anulado: true, motivoAnulacion: 'Residente equivocado', anuladoPorId: 8, puntajeTotal: 28 });
      expect(await leer(e.id)).toMatchObject({ anulado: true, creadoPorId: 7, modificadoPorId: 8, riesgoCaida: 'Riesgo bajo o leve', numeroControl: 1 });
      await expect(svc.anular(e.id, 'otra vez', 9)).rejects.toBeInstanceOf(ConflictException);
      expect((await leer(e.id)).motivoAnulacion).toBe('Residente equivocado');
    });

    it('evaluación inexistente ⇒ 404', async () => {
      await expect(svc.anular(999_999_999, 'x', 8)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('dos anulaciones SIMULTÁNEAS de la misma evaluación: una gana y la otra recibe 409', async () => {
      for (let ronda = 0; ronda < 5; ronda++) {
        const exp = await nacido1940();
        const e = await svc.crear(exp, MAXIMO, 7);
        const r = await Promise.allSettled([svc.anular(e.id, 'motivo A', 8), svc.anular(e.id, 'motivo B', 9)]);
        expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
        expect((r.find((x) => x.status === 'rejected') as PromiseRejectedResult).reason).toBeInstanceOf(ConflictException);
        const ganadora = r.findIndex((x) => x.status === 'fulfilled');
        expect((await leer(e.id)).motivoAnulacion).toBe(ganadora === 0 ? 'motivo A' : 'motivo B');
      }
    });
  });

  describe('esquema (synchronize)', () => {
    it('índice (expediente_id, fecha), UNIQUE (expediente_id, numero_control) y FK a expediente_residente', async () => {
      const indices: { Key_name: string; Column_name: string; Non_unique: number; Seq_in_index: number }[] = await ds.query('SHOW INDEX FROM evaluacion_tinetti');
      const cols = (nombre: string) => indices.filter((i) => i.Key_name === nombre).sort((a, b) => a.Seq_in_index - b.Seq_in_index);
      expect(cols('idx_evaluacion_tinetti_expediente_fecha').map((i) => i.Column_name)).toEqual(['expediente_id', 'fecha']);
      const unico = cols('uq_evaluacion_tinetti_expediente_control');
      expect(unico.map((i) => i.Column_name)).toEqual(['expediente_id', 'numero_control']);
      expect(unico[0].Non_unique).toBe(0);
      const fks: { t: string }[] = await ds.query(
        `SELECT REFERENCED_TABLE_NAME AS t FROM information_schema.KEY_COLUMN_USAGE
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'evaluacion_tinetti' AND REFERENCED_TABLE_NAME IS NOT NULL`,
      );
      expect(fks.map((f) => f.t)).toEqual(['expediente_residente']);
    });

    it('tipos: veinte ítems y tres puntajes tinyint NOT NULL; riesgo y versión varchar; observaciones text nullable', async () => {
      const cols: { Field: string; Type: string; Null: string }[] = await ds.query('SHOW COLUMNS FROM evaluacion_tinetti');
      const c = (n: string) => cols.find((x) => x.Field === n);
      for (const n of [...ITEMS_TINETTI_V1.map((i) => i.campo), 'puntajeEquilibrio', 'puntajeMarcha', 'puntajeTotal']) {
        expect(c(n)).toMatchObject({ Type: 'tinyint', Null: 'NO' });
      }
      expect(c('riesgoCaida')).toMatchObject({ Type: 'varchar(40)', Null: 'NO' });
      expect(c('versionInstrumento')).toMatchObject({ Type: 'varchar(30)', Null: 'NO' });
      expect(c('edadMomentoEvaluacion')?.Type).toMatch(/^int/);
      expect(c('numero_control')?.Null).toBe('NO');
      expect(c('observaciones')).toMatchObject({ Type: 'text', Null: 'YES' });
    });
  });
});
