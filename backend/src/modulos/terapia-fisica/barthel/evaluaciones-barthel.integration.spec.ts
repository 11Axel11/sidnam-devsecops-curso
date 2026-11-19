import 'reflect-metadata';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { generarTextoLargo } from 'src/common/testing/texto-largo.helper';
import { MAX_TEXTO_LIBRE } from 'src/common/validators/texto-libre.decorator';
import { EvaluacionBarthel } from '../entities/evaluacion-barthel.entity';
import { abrirDataSourceDeIntegracion, INTEGRACION_ACTIVA, nuevoExpediente } from '../valoraciones/testing/integracion';
import { ItemsBarthel } from './barthel-v1.instrumento';
import { EvaluacionesBarthelService } from './evaluaciones-barthel.service';

/**
 * INTEGRACIÓN con MySQL REAL (opt-in; ver valoraciones/testing/integracion.ts) del Índice de Barthel:
 * total y grado persistidos, silla de ruedas, texto largo, anulación (incluida la simultánea) y esquema.
 *
 *   RUN_DB_INTEGRATION=1 DB_TEST_NAME=sidnam_scratch_b4 npx jest integration --runInBand
 *
 * Las suites de integración comparten la base y hacen `synchronize`: correrlas EN SERIE (--runInBand).
 */
const MAXIMO: ItemsBarthel = {
  comer: 10, lavarse: 5, vestirse: 10, arreglarse: 5, deposiciones: 10,
  miccion: 10, usarRetrete: 10, trasladarse: 15, deambular: 15, escalones: 10,
};
const con = (c: Partial<ItemsBarthel>): ItemsBarthel => ({ ...MAXIMO, ...c });

(INTEGRACION_ACTIVA ? describe : describe.skip)('Índice de Barthel — integración MySQL', () => {
  jest.setTimeout(240_000);
  let ds: DataSource;
  let svc: EvaluacionesBarthelService;

  beforeAll(async () => {
    ds = await abrirDataSourceDeIntegracion();
    svc = new EvaluacionesBarthelService(ds);
  });

  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  const leer = (id: number) => ds.getRepository(EvaluacionBarthel).findOneByOrFail({ id });
  const total = (e: EvaluacionBarthel) => e.puntajeTotal;

  describe('cálculo almacenado (RN-04/09/10)', () => {
    it('CA-08 de punta a punta: suma 45 ⇒ total y grado persistidos con la versión; los ítems vuelven como number', async () => {
      const exp = await nuevoExpediente(ds);
      const e = await svc.crear(
        exp,
        { fecha: '2026-10-21', comer: 10, lavarse: 0, vestirse: 10, arreglarse: 5, deposiciones: 10, miccion: 10, usarRetrete: 0, trasladarse: 0, deambular: 0, escalones: 0, observaciones: 'Requiere supervisión' },
        7,
      );
      const guardada = await leer(e.id);
      expect(guardada).toMatchObject({
        expedienteId: exp,
        fecha: '2026-10-21',
        usuarioExaminadorId: 7,
        creadoPorId: 7,
        puntajeTotal: 45,
        gradoDependencia: 'Dependencia Severa',
        versionInstrumento: 'Barthel-v1',
        comer: 10,
        trasladarse: 0,
        observaciones: 'Requiere supervisión',
        anulado: false,
      });
      expect(typeof guardada.puntajeTotal).toBe('number');
    });

    it('silla de ruedas: el grado con guion largo se guarda y se lee idéntico (utf8mb4)', async () => {
      const exp = await nuevoExpediente(ds);
      const e = await svc.crear(exp, con({ deambular: 5 }), 7);
      expect(await leer(e.id)).toMatchObject({ puntajeTotal: 90, gradoDependencia: 'Independencia — uso de silla de ruedas' });
    });

    it('los seis grados de la tabla confirmada persisten tal cual', async () => {
      const exp = await nuevoExpediente(ds);
      const casos: [Partial<ItemsBarthel>, number, string][] = [
        [{ comer: 0, lavarse: 0, vestirse: 0, arreglarse: 0, deposiciones: 0, miccion: 0, usarRetrete: 0, trasladarse: 0, deambular: 0, escalones: 0 }, 0, 'Dependencia Total'],
        [{ comer: 0, vestirse: 0, deposiciones: 0, miccion: 0, usarRetrete: 0, trasladarse: 15, deambular: 15, escalones: 0 }, 30, 'Dependencia Severa'],
        [{ escalones: 0 }, 90, 'Dependencia Moderada'],
        [{ escalones: 5 }, 95, 'Dependencia Escasa'],
        [{}, 100, 'Independencia'],
        [{ deambular: 5 }, 90, 'Independencia — uso de silla de ruedas'],
      ];
      for (const [cambios, t, grado] of casos) {
        const base = t === 0 || t === 30 ? Object.fromEntries(Object.keys(MAXIMO).map((k) => [k, 0])) : MAXIMO;
        const e = await svc.crear(exp, { ...(base as ItemsBarthel), ...cambios }, 7);
        expect(await leer(e.id)).toMatchObject({ puntajeTotal: t, gradoDependencia: grado });
      }
    });

    it('lo guardado no cambia al volver a leer la fila (nunca se recalcula)', async () => {
      const exp = await nuevoExpediente(ds);
      const e = await svc.crear(exp, MAXIMO, 7);
      await ds.query("UPDATE evaluacion_barthel SET puntajeTotal = 42, gradoDependencia = 'Moderado', versionInstrumento = 'Barthel-v0' WHERE id = ?", [e.id]); // dato histórico
      expect((await svc.listar(exp, {}))[0]).toMatchObject({ puntajeTotal: 42, gradoDependencia: 'Moderado', versionInstrumento: 'Barthel-v0' });
    });
  });

  describe('validaciones que dependen de la base', () => {
    it('expediente inexistente ⇒ 404 (crear y listar)', async () => {
      await expect(svc.crear(999_999_999, MAXIMO, 7)).rejects.toBeInstanceOf(NotFoundException);
      await expect(svc.listar(999_999_999, {})).rejects.toBeInstanceOf(NotFoundException);
    });

    it('fecha futura ⇒ 400 y nada se guarda; sin fecha usa hoy (Costa Rica)', async () => {
      const exp = await nuevoExpediente(ds);
      await expect(svc.crear(exp, { ...MAXIMO, fecha: '2999-01-01' }, 7)).rejects.toBeInstanceOf(BadRequestException);
      expect(await ds.getRepository(EvaluacionBarthel).count({ where: { expedienteId: exp } })).toBe(0);
      const e = await svc.crear(exp, MAXIMO, 7);
      expect(e.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('texto largo (CA-06): sin fragmentar', () => {
    it('observaciones de 2500 y de 20 000 caracteres vuelven idénticas', async () => {
      const exp = await nuevoExpediente(ds);
      for (const n of [2500, MAX_TEXTO_LIBRE]) {
        const texto = generarTextoLargo(n);
        const e = await svc.crear(exp, { ...MAXIMO, observaciones: texto }, 7);
        expect((await leer(e.id)).observaciones).toBe(texto);
      }
    });

    it('el motivo de anulación de 2000 caracteres vuelve idéntico', async () => {
      const exp = await nuevoExpediente(ds);
      const e = await svc.crear(exp, MAXIMO, 7);
      const motivo = generarTextoLargo(2000);
      await svc.anular(e.id, motivo, 8);
      expect((await leer(e.id)).motivoAnulacion).toBe(motivo);
    });
  });

  describe('serie y filtros', () => {
    it('más reciente primero, desde/hasta inclusivos y anuladas excluidas por defecto', async () => {
      const exp = await nuevoExpediente(ds);
      const a = await svc.crear(exp, { ...MAXIMO, fecha: '2026-01-10' }, 7);
      const b = await svc.crear(exp, { ...MAXIMO, fecha: '2026-04-21' }, 7);
      const c = await svc.crear(exp, { ...MAXIMO, fecha: '2026-10-01' }, 7);
      expect((await svc.listar(exp, {})).map((e) => e.id)).toEqual([c.id, b.id, a.id]);
      expect((await svc.listar(exp, { desde: '2026-01-10', hasta: '2026-04-21' })).map((e) => e.id)).toEqual([b.id, a.id]);
      await svc.anular(c.id, 'Error', 8);
      expect((await svc.listar(exp, {})).map((e) => e.id)).toEqual([b.id, a.id]);
      expect((await svc.listar(exp, { incluirAnulados: true })).map((e) => e.id)).toEqual([c.id, b.id, a.id]);
      expect((await svc.listar(exp, { incluirAnulados: true })).map(total)).toEqual([100, 100, 100]);
    });
  });

  describe('anulación (RN-02): nunca DELETE', () => {
    it('anula con motivo, usuario y fecha y deja la fila; segunda vez ⇒ 409', async () => {
      const exp = await nuevoExpediente(ds);
      const e = await svc.crear(exp, MAXIMO, 7);
      const r = await svc.anular(e.id, 'Residente equivocado', 8);
      expect(r).toMatchObject({ anulado: true, motivoAnulacion: 'Residente equivocado', anuladoPorId: 8, puntajeTotal: 100 });
      expect(await leer(e.id)).toMatchObject({ anulado: true, creadoPorId: 7, modificadoPorId: 8, gradoDependencia: 'Independencia' });
      await expect(svc.anular(e.id, 'otra vez', 9)).rejects.toBeInstanceOf(ConflictException);
      expect((await leer(e.id)).motivoAnulacion).toBe('Residente equivocado');
    });

    it('evaluación inexistente ⇒ 404', async () => {
      await expect(svc.anular(999_999_999, 'x', 8)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('dos anulaciones SIMULTÁNEAS de la misma evaluación: una gana y la otra recibe 409', async () => {
      for (let ronda = 0; ronda < 5; ronda++) {
        const exp = await nuevoExpediente(ds);
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
    it('índice (expediente_id, fecha) y FK a expediente_residente', async () => {
      const indices: { Key_name: string; Column_name: string; Seq_in_index: number }[] = await ds.query('SHOW INDEX FROM evaluacion_barthel');
      const columnas = indices
        .filter((i) => i.Key_name === 'idx_evaluacion_barthel_expediente_fecha')
        .sort((a, b) => a.Seq_in_index - b.Seq_in_index)
        .map((i) => i.Column_name);
      expect(columnas).toEqual(['expediente_id', 'fecha']);
      const fks: { t: string }[] = await ds.query(
        `SELECT REFERENCED_TABLE_NAME AS t FROM information_schema.KEY_COLUMN_USAGE
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'evaluacion_barthel' AND REFERENCED_TABLE_NAME IS NOT NULL`,
      );
      expect(fks.map((f) => f.t)).toEqual(['expediente_residente']);
    });

    it('tipos: ítems y total tinyint NOT NULL; grado y versión varchar NOT NULL; observaciones text nullable', async () => {
      const cols: { Field: string; Type: string; Null: string }[] = await ds.query('SHOW COLUMNS FROM evaluacion_barthel');
      const c = (n: string) => cols.find((x) => x.Field === n);
      for (const n of ['comer', 'lavarse', 'vestirse', 'arreglarse', 'deposiciones', 'miccion', 'usarRetrete', 'trasladarse', 'deambular', 'escalones', 'puntajeTotal']) {
        expect(c(n)).toMatchObject({ Type: 'tinyint', Null: 'NO' });
      }
      expect(c('gradoDependencia')).toMatchObject({ Type: 'varchar(60)', Null: 'NO' });
      expect(c('versionInstrumento')).toMatchObject({ Type: 'varchar(30)', Null: 'NO' });
      expect(c('observaciones')).toMatchObject({ Type: 'text', Null: 'YES' });
    });
  });
});
