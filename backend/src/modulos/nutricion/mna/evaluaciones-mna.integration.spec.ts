import 'reflect-metadata';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { generarTextoLargo } from 'src/common/testing/texto-largo.helper';
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
 * INTEGRACIÓN con MySQL REAL (opt-in; ver terapia-fisica/valoraciones/testing/integracion.ts) del MNA: decimales
 * sin pérdida (medios puntos), segunda parte opcional, vínculo con un control real (incluida la exclusión mutua
 * bajo concurrencia), vista previa sin persistir, texto, anulación (incluida la simultánea) y esquema.
 *
 *   RUN_DB_INTEGRATION=1 DB_TEST_NAME=sidnam_scratch_b4 npx jest integration --runInBand
 *
 * Las suites de integración comparten la base y hacen `synchronize`: correrlas EN SERIE (--runInBand).
 */
const CRIBAJE_9 = { itemA: 1, itemB: 2, itemC: 1, itemD: 2, itemE: 1 };
const CRIBAJE_13 = { itemA: 2, itemB: 3, itemC: 2, itemD: 2, itemE: 2 };
const EVALUACION_12_5 = { itemG: 1, itemH: 1, itemI: 1, itemJ: 2, itemK: 0.5, itemL: 1, itemM: 1, itemN: 2, itemO: 2, itemP: 1, itemQ: 0, itemR: 0 };
const EVALUACION_16 = { itemG: 1, itemH: 1, itemI: 1, itemJ: 2, itemK: 1, itemL: 1, itemM: 1, itemN: 2, itemO: 2, itemP: 2, itemQ: 1, itemR: 1 };
const dto = (parcial: object): CrearEvaluacionMnaDto => parcial as CrearEvaluacionMnaDto;
const CA16 = { ...CRIBAJE_9, itemF: 2, ...EVALUACION_12_5 };

(INTEGRACION_ACTIVA ? describe : describe.skip)('MNA — integración MySQL', () => {
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
  const leer = (id: number) => ds.getRepository(EvaluacionMna).findOneByOrFail({ id });
  const crudo = async (id: number): Promise<Record<string, string | null>> => {
    const filas: Record<string, string | null>[] = await ds.query(
      `SELECT CAST(itemK AS CHAR) AS k, CAST(itemQ AS CHAR) AS q, CAST(subtotalEvaluacion AS CHAR) AS ev, CAST(evaluacionGlobal AS CHAR) AS gl,
              CAST(subtotalCribaje AS CHAR) AS cr FROM evaluacion_mna WHERE id = ?`,
      [id],
    );
    return filas[0];
  };
  /** Control real (peso/talla ⇒ IMC): 58,4 kg y 152 cm ⇒ 25,3 ⇒ itemF = 3. */
  const control = async (exp: number, fecha = '2026-10-01', peso = 58.4, talla = 152) => (await controles.crear(exp, { peso, talla, fecha }, 7)).id;
  const filas = (exp: number) => ds.getRepository(EvaluacionMna).count({ where: { expedienteId: exp } });

  describe('cálculo almacenado (RN-04/09/10), decimales sin pérdida', () => {
    it('CA-16 de punta a punta: cribaje 9 + evaluación 12,5 ⇒ 21,5; los medios puntos vuelven como number y exactos en la base', async () => {
      const exp = await expediente();
      const e = await svc.crear(exp, dto({ ...CA16, fecha: '2026-10-21' }), 7);
      const g = await leer(e.id);
      expect(g).toMatchObject({
        expedienteId: exp, fecha: '2026-10-21', usuarioResponsableId: 7, creadoPorId: 7, controlNutricionalId: null,
        subtotalCribaje: 9, interpretacionCribaje: 'Riesgo de malnutrición. Continuar la evaluación.',
        subtotalEvaluacion: 12.5, evaluacionGlobal: 21.5, interpretacionGlobal: 'Riesgo de malnutrición', versionInstrumento: 'MNA-v1',
        itemK: 0.5, itemM: 1, itemP: 1, itemQ: 0, anulado: false,
      });
      expect(typeof g.itemK).toBe('number');
      expect(typeof g.evaluacionGlobal).toBe('number');
      expect(await crudo(e.id)).toEqual({ k: '0.5', q: '0.0', ev: '12.5', gl: '21.5', cr: '9.0' });
    });

    it('MÁXIMO 30 con el ítem Q = 1,0 (no 2,0)', async () => {
      const exp = await expediente();
      const e = await svc.crear(exp, dto({ itemA: 2, itemB: 3, itemC: 2, itemD: 2, itemE: 2, itemF: 3, ...EVALUACION_16 }), 7);
      expect(await crudo(e.id)).toMatchObject({ q: '1.0', ev: '16.0', gl: '30.0' });
      expect(await leer(e.id)).toMatchObject({ evaluacionGlobal: 30, interpretacionGlobal: 'Estado nutricional normal' });
    });

    it('las tres interpretaciones globales y las fronteras con medios puntos persisten tal cual', async () => {
      const exp = await expediente();
      // cribaje 12 + evaluación 4,5 = 16,5 (malnutrición); + 5 = 17 (riesgo); + 11,5 = 23,5 (riesgo); + 12 = 24 (normal)
      const casos: [object, number, string][] = [
        [{ itemG: 1, itemH: 1, itemI: 1, itemJ: 1, itemK: 0.5, itemL: 0, itemM: 0, itemN: 0, itemO: 0, itemP: 0, itemQ: 0, itemR: 0 }, 16.5, 'Malnutrición'],
        [{ itemG: 1, itemH: 1, itemI: 1, itemJ: 1, itemK: 1, itemL: 0, itemM: 0, itemN: 0, itemO: 0, itemP: 0, itemQ: 0, itemR: 0 }, 17, 'Riesgo de malnutrición'],
        [{ itemG: 1, itemH: 1, itemI: 1, itemJ: 1, itemK: 1, itemL: 1, itemM: 1, itemN: 2, itemO: 2, itemP: 0.5, itemQ: 0, itemR: 0 }, 23.5, 'Riesgo de malnutrición'],
        [{ itemG: 1, itemH: 1, itemI: 1, itemJ: 2, itemK: 1, itemL: 1, itemM: 1, itemN: 2, itemO: 2, itemP: 0, itemQ: 0, itemR: 0 }, 24, 'Estado nutricional normal'],
      ];
      for (const [ev, global, texto] of casos) {
        const e = await svc.crear(exp, dto({ ...CRIBAJE_13, itemA: 2, itemB: 3, itemC: 2, itemD: 2, itemE: 1, itemF: 2, ...ev }), 7);
        expect(await leer(e.id)).toMatchObject({ subtotalCribaje: 12, evaluacionGlobal: global, interpretacionGlobal: texto });
      }
    });

    it('cribaje ≥ 12 sin segunda parte: G–R, evaluación, global e interpretación global quedan NULL en la base', async () => {
      const exp = await expediente();
      const e = await svc.crear(exp, dto({ ...CRIBAJE_13, itemF: 3 }), 7);
      const g = await leer(e.id);
      expect(g).toMatchObject({ subtotalCribaje: 14, interpretacionCribaje: 'Estado nutricional normal. No es necesario continuar la evaluación.', itemG: null, itemK: null, itemR: null, subtotalEvaluacion: null, evaluacionGlobal: null, interpretacionGlobal: null });
    });

    it('lo guardado no cambia al volver a leer la fila (nunca se recalcula)', async () => {
      const exp = await expediente();
      const e = await svc.crear(exp, dto(CA16), 7);
      await ds.query("UPDATE evaluacion_mna SET evaluacionGlobal = 11.5, interpretacionGlobal = 'Malnutrición', versionInstrumento = 'MNA-v0' WHERE id = ?", [e.id]);
      expect((await svc.listar(exp, {}))[0]).toMatchObject({ evaluacionGlobal: 11.5, interpretacionGlobal: 'Malnutrición', versionInstrumento: 'MNA-v0' });
    });
  });

  describe('validaciones que dependen de la base', () => {
    it('expediente inexistente ⇒ 404 (crear, calcular y listar)', async () => {
      await expect(svc.crear(999_999_999, dto(CA16), 7)).rejects.toBeInstanceOf(NotFoundException);
      await expect(svc.calcular(999_999_999, dto(CA16))).rejects.toBeInstanceOf(NotFoundException);
      await expect(svc.listar(999_999_999, {})).rejects.toBeInstanceOf(NotFoundException);
    });

    it('fecha futura ⇒ 400 y nada se guarda; sin fecha usa hoy (Costa Rica)', async () => {
      const exp = await expediente();
      await expect(svc.crear(exp, dto({ ...CA16, fecha: '2999-01-01' }), 7)).rejects.toBeInstanceOf(BadRequestException);
      expect(await filas(exp)).toBe(0);
      expect((await svc.crear(exp, dto(CA16), 7)).fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('segunda parte obligatoria con cribaje < 12 ⇒ 400 y no queda nada', async () => {
      const exp = await expediente();
      await expect(svc.crear(exp, dto({ ...CRIBAJE_9, itemF: 2 }), 7)).rejects.toBeInstanceOf(BadRequestException);
      expect(await filas(exp)).toBe(0);
    });
  });

  describe('vínculo con un control nutricional REAL', () => {
    it('éxito: itemF se deriva del IMC almacenado del control (58,4 kg y 152 cm ⇒ 25,3 ⇒ 3) y queda el controlNutricionalId', async () => {
      const exp = await expediente();
      const c = await control(exp);
      const e = await svc.crear(exp, dto({ ...CRIBAJE_9, ...EVALUACION_12_5, controlNutricionalId: c }), 7);
      expect(await leer(e.id)).toMatchObject({ controlNutricionalId: c, itemF: 3, subtotalCribaje: 10, evaluacionGlobal: 22.5 });
    });

    it('itemF manual distinto del derivado ⇒ 400; igual ⇒ ok', async () => {
      const exp = await expediente();
      const c = await control(exp);
      await expect(svc.crear(exp, dto({ ...CRIBAJE_13, ...EVALUACION_16, itemF: 1, controlNutricionalId: c }), 7)).rejects.toBeInstanceOf(BadRequestException);
      await expect(svc.crear(exp, dto({ ...CRIBAJE_13, ...EVALUACION_16, itemF: 3, controlNutricionalId: c }), 7)).resolves.toMatchObject({ itemF: 3 });
    });

    it('control de OTRO expediente ⇒ 400; anulado ⇒ 400; inexistente ⇒ 400; posterior a la fecha ⇒ 400', async () => {
      const exp = await expediente();
      const otro = await expediente();
      const deOtro = await control(otro);
      const anulado = await control(exp);
      await controles.anular(anulado, 'Error', 8);
      const futuro = await control(exp, '2026-10-20');
      const base = { ...CRIBAJE_13, ...EVALUACION_16 };
      await expect(svc.crear(exp, dto({ ...base, controlNutricionalId: deOtro }), 7)).rejects.toBeInstanceOf(BadRequestException);
      await expect(svc.crear(exp, dto({ ...base, controlNutricionalId: anulado }), 7)).rejects.toBeInstanceOf(BadRequestException);
      await expect(svc.crear(exp, dto({ ...base, controlNutricionalId: 999_999_999 }), 7)).rejects.toBeInstanceOf(BadRequestException);
      await expect(svc.crear(exp, dto({ ...base, controlNutricionalId: futuro, fecha: '2026-10-10' }), 7)).rejects.toBeInstanceOf(BadRequestException);
      expect(await filas(exp)).toBe(0);
    });

    it('un control con una evaluación ACTIVA ⇒ 409; tras anularla se puede vincular otra vez (por eso no hay UNIQUE)', async () => {
      const exp = await expediente();
      const c = await control(exp);
      const base = { ...CRIBAJE_13, ...EVALUACION_16, controlNutricionalId: c };
      const primera = await svc.crear(exp, dto(base), 7);
      await expect(svc.crear(exp, dto(base), 7)).rejects.toBeInstanceOf(ConflictException);
      await svc.anular(primera.id, 'Error de digitación', 8);
      await expect(svc.crear(exp, dto(base), 7)).resolves.toMatchObject({ controlNutricionalId: c });
    });

    it('SIMULTÁNEO: 5 registros a la vez con el mismo control ⇒ exactamente 1 gana y el resto recibe 409 (repetido 3 veces)', async () => {
      for (let ronda = 0; ronda < 3; ronda++) {
        const exp = await expediente();
        const c = await control(exp);
        const base = dto({ ...CRIBAJE_13, ...EVALUACION_16, controlNutricionalId: c });
        const r = await Promise.allSettled(Array.from({ length: 5 }, () => svc.crear(exp, base, 7)));
        expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
        const rechazos = r.filter((x): x is PromiseRejectedResult => x.status === 'rejected');
        expect(rechazos).toHaveLength(4);
        for (const x of rechazos) expect(x.reason).toBeInstanceOf(ConflictException);
        expect(await ds.getRepository(EvaluacionMna).count({ where: { controlNutricionalId: c, anulado: false } })).toBe(1);
      }
    });

    it('si el control se anula DESPUÉS, la evaluación conserva su itemF (RN-04)', async () => {
      const exp = await expediente();
      const c = await control(exp);
      const e = await svc.crear(exp, dto({ ...CRIBAJE_13, ...EVALUACION_16, controlNutricionalId: c }), 7);
      await controles.anular(c, 'Error', 8);
      expect(await leer(e.id)).toMatchObject({ itemF: 3, controlNutricionalId: c, subtotalCribaje: 14 });
    });
  });

  describe('vista previa (POST …/calcular): no persiste nada', () => {
    it('devuelve el mismo cálculo que el registro y no deja filas', async () => {
      const exp = await expediente();
      const vista = await svc.calcular(exp, dto(CA16));
      expect(await filas(exp)).toBe(0);
      expect(vista).toMatchObject({ subtotalCribaje: 9, evaluacionGlobal: 21.5, interpretacionGlobal: 'Riesgo de malnutrición', itemF: 2, segundaParte: { requerida: true, completa: true, itemsFaltantes: [] } });
      const oficial = await svc.crear(exp, dto(CA16), 7);
      expect(oficial).toMatchObject({ subtotalCribaje: vista.subtotalCribaje, evaluacionGlobal: vista.evaluacionGlobal, interpretacionGlobal: vista.interpretacionGlobal });
    });

    it('cribaje < 12 sin G–R, cribaje ≥ 12 sin G–R y G–R a medias NO son error: informan segundaParte y no guardan nada', async () => {
      const exp = await expediente();
      expect(await svc.calcular(exp, dto({ ...CRIBAJE_9, itemF: 2 }))).toMatchObject({
        subtotalCribaje: 9, interpretacionCribaje: 'Riesgo de malnutrición. Continuar la evaluación.', subtotalEvaluacion: null, evaluacionGlobal: null, interpretacionGlobal: null,
        segundaParte: { requerida: true, completa: false },
      });
      expect(await svc.calcular(exp, dto({ ...CRIBAJE_13, itemF: 2 }))).toMatchObject({ subtotalCribaje: 13, segundaParte: { requerida: false, completa: false } });
      const medias = await svc.calcular(exp, dto({ ...CRIBAJE_13, itemF: 2, itemG: 1, itemK: 0.5 }));
      expect(medias.segundaParte).toMatchObject({ requerida: false, completa: false });
      expect(medias.segundaParte.itemsFaltantes).toHaveLength(10);
      expect(medias.evaluacionGlobal).toBeNull();
      expect(await filas(exp)).toBe(0);
      // el registro con esos mismos cuerpos sigue siendo estricto
      await expect(svc.crear(exp, dto({ ...CRIBAJE_9, itemF: 2 }), 7)).rejects.toBeInstanceOf(BadRequestException);
      await expect(svc.crear(exp, dto({ ...CRIBAJE_13, itemF: 2, itemG: 1, itemK: 0.5 }), 7)).rejects.toBeInstanceOf(BadRequestException);
      expect(await filas(exp)).toBe(0);
    });

    it('la vista previa mantiene los 400/409 del vínculo con un control real (otro expediente, anulado, itemF distinto, ya vinculado)', async () => {
      const exp = await expediente();
      const otro = await expediente();
      const base = { ...CRIBAJE_13, ...EVALUACION_16 };
      const deOtro = await control(otro);
      const anulado = await control(exp, '2026-09-01');
      await controles.anular(anulado, 'Error', 8);
      const c = await control(exp);
      await expect(svc.calcular(exp, dto({ ...base, controlNutricionalId: deOtro }))).rejects.toBeInstanceOf(BadRequestException);
      await expect(svc.calcular(exp, dto({ ...base, controlNutricionalId: anulado }))).rejects.toBeInstanceOf(BadRequestException);
      await expect(svc.calcular(exp, dto({ ...base, itemF: 1, controlNutricionalId: c }))).rejects.toBeInstanceOf(BadRequestException);
      await svc.crear(exp, dto({ ...base, controlNutricionalId: c }), 7);
      await expect(svc.calcular(exp, dto({ ...base, controlNutricionalId: c }))).rejects.toBeInstanceOf(ConflictException);
    });

    it('con control: deriva el ítem F sin vincularlo ni bloquearlo; muchas vistas previas simultáneas no se estorban', async () => {
      const exp = await expediente();
      const c = await control(exp);
      const base = dto({ ...CRIBAJE_13, ...EVALUACION_16, controlNutricionalId: c });
      const r = await Promise.all(Array.from({ length: 8 }, () => svc.calcular(exp, base)));
      for (const v of r) expect(v).toMatchObject({ itemF: 3, subtotalCribaje: 14, evaluacionGlobal: 30 });
      expect(await filas(exp)).toBe(0);
      await expect(svc.crear(exp, base, 7)).resolves.toBeDefined(); // el control sigue libre
    });
  });

  describe('texto y anulación (RN-02): nunca DELETE', () => {
    it('el motivo de anulación de 2000 caracteres vuelve idéntico', async () => {
      const exp = await expediente();
      const e = await svc.crear(exp, dto(CA16), 7);
      const motivo = generarTextoLargo(2000);
      await svc.anular(e.id, motivo, 8);
      expect((await leer(e.id)).motivoAnulacion).toBe(motivo);
    });

    it('las interpretaciones con tildes y punto final se guardan íntegras (utf8mb4)', async () => {
      const exp = await expediente();
      const e = await svc.crear(exp, dto({ ...CRIBAJE_13, itemF: 2 }), 7);
      expect((await leer(e.id)).interpretacionCribaje).toBe('Estado nutricional normal. No es necesario continuar la evaluación.');
    });

    it('serie: más reciente primero, desde/hasta inclusivos, anuladas excluidas por defecto', async () => {
      const exp = await expediente();
      const a = await svc.crear(exp, dto({ ...CA16, fecha: '2026-01-10' }), 7);
      const b = await svc.crear(exp, dto({ ...CA16, fecha: '2026-04-21' }), 7);
      const c = await svc.crear(exp, dto({ ...CA16, fecha: '2026-10-01' }), 7);
      expect((await svc.listar(exp, {})).map((e) => e.id)).toEqual([c.id, b.id, a.id]);
      expect((await svc.listar(exp, { desde: '2026-01-10', hasta: '2026-04-21' })).map((e) => e.id)).toEqual([b.id, a.id]);
      await svc.anular(c.id, 'Error', 8);
      expect((await svc.listar(exp, {})).map((e) => e.id)).toEqual([b.id, a.id]);
      expect((await svc.listar(exp, { incluirAnulados: true })).map((e) => e.id)).toEqual([c.id, b.id, a.id]);
    });

    it('anula con motivo, usuario y fecha y deja la fila; segunda vez ⇒ 409; inexistente ⇒ 404', async () => {
      const exp = await expediente();
      const e = await svc.crear(exp, dto(CA16), 7);
      const r = await svc.anular(e.id, 'Residente equivocado', 8);
      expect(r).toMatchObject({ anulado: true, motivoAnulacion: 'Residente equivocado', anuladoPorId: 8, evaluacionGlobal: 21.5 });
      expect(await leer(e.id)).toMatchObject({ anulado: true, creadoPorId: 7, modificadoPorId: 8, interpretacionGlobal: 'Riesgo de malnutrición' });
      await expect(svc.anular(e.id, 'otra vez', 9)).rejects.toBeInstanceOf(ConflictException);
      await expect(svc.anular(999_999_999, 'x', 8)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('dos anulaciones SIMULTÁNEAS de la misma evaluación: una gana y la otra recibe 409', async () => {
      for (let ronda = 0; ronda < 5; ronda++) {
        const exp = await expediente();
        const e = await svc.crear(exp, dto(CA16), 7);
        const r = await Promise.allSettled([svc.anular(e.id, 'motivo A', 8), svc.anular(e.id, 'motivo B', 9)]);
        expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
        expect((r.find((x) => x.status === 'rejected') as PromiseRejectedResult).reason).toBeInstanceOf(ConflictException);
        const ganadora = r.findIndex((x) => x.status === 'fulfilled');
        expect((await leer(e.id)).motivoAnulacion).toBe(ganadora === 0 ? 'motivo A' : 'motivo B');
      }
    });
  });

  describe('esquema (synchronize)', () => {
    it('índice (expediente_id, fecha) y FKs a expediente_residente y control_nutricional (sin UNIQUE sobre el control)', async () => {
      const indices: { Key_name: string; Column_name: string; Non_unique: number; Seq_in_index: number }[] = await ds.query('SHOW INDEX FROM evaluacion_mna');
      const cols = (n: string) => indices.filter((i) => i.Key_name === n).sort((a, b) => a.Seq_in_index - b.Seq_in_index).map((i) => i.Column_name);
      expect(cols('idx_evaluacion_mna_expediente_fecha')).toEqual(['expediente_id', 'fecha']);
      const sobreControl = indices.filter((i) => i.Column_name === 'control_nutricional_id');
      expect(sobreControl.length).toBeGreaterThan(0); // índice de la FK
      expect(sobreControl.every((i) => i.Non_unique === 1)).toBe(true); // ninguno único
      const fks: { t: string }[] = await ds.query(
        `SELECT REFERENCED_TABLE_NAME AS t FROM information_schema.KEY_COLUMN_USAGE
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'evaluacion_mna' AND REFERENCED_TABLE_NAME IS NOT NULL`,
      );
      expect(fks.map((f) => f.t).sort()).toEqual(['control_nutricional', 'expediente_residente']);
    });

    it('tipos: medios puntos decimal(2,1); subtotales decimal(3,1); cribaje NOT NULL y evaluación nullable', async () => {
      const cols: { Field: string; Type: string; Null: string }[] = await ds.query('SHOW COLUMNS FROM evaluacion_mna');
      const c = (n: string) => cols.find((x) => x.Field === n);
      for (const n of ['itemA', 'itemB', 'itemC', 'itemD', 'itemE', 'itemF']) expect(c(n)).toMatchObject({ Type: 'tinyint', Null: 'NO' });
      for (const n of ['itemK', 'itemM', 'itemP', 'itemQ']) expect(c(n)).toMatchObject({ Type: 'decimal(2,1)', Null: 'YES' });
      for (const n of ['itemG', 'itemH', 'itemI', 'itemJ', 'itemL', 'itemN', 'itemO', 'itemR']) expect(c(n)).toMatchObject({ Type: 'tinyint', Null: 'YES' });
      expect(c('subtotalCribaje')).toMatchObject({ Type: 'decimal(3,1)', Null: 'NO' });
      expect(c('subtotalEvaluacion')).toMatchObject({ Type: 'decimal(3,1)', Null: 'YES' });
      expect(c('evaluacionGlobal')).toMatchObject({ Type: 'decimal(3,1)', Null: 'YES' });
      expect(c('interpretacionGlobal')).toMatchObject({ Type: 'varchar(60)', Null: 'YES' });
      expect(c('interpretacionCribaje')).toMatchObject({ Type: 'varchar(100)', Null: 'NO' });
      expect(c('versionInstrumento')).toMatchObject({ Type: 'varchar(30)', Null: 'NO' });
      expect(c('control_nutricional_id')).toMatchObject({ Null: 'YES' });
    });
  });
});
