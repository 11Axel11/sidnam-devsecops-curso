/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return -- prueba contra MySQL real */
import 'reflect-metadata';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EstadoValoracion } from 'src/common/enums/estadoValoracion.enum';
import { DatoFuncionalNutricion } from 'src/modulos/catalogos/entities/catalogos.entities';
import { DATOS_FUNCIONALES_NUTRICION } from 'src/modulos/catalogos/seed/catalogos-iniciales';
import {
  abrirDataSourceDeIntegracion,
  INTEGRACION_ACTIVA,
  nuevoExpediente,
} from 'src/modulos/terapia-fisica/valoraciones/testing/integracion';
import { ValoracionNutricional } from '../entities/valoracion-nutricional.entity';
import { EstadoCognitivo } from '../enums/estado-cognitivo.enum';
import { ValoracionesNutricionalesService } from './valoraciones-nutricionales.service';

/**
 * INTEGRACIÓN con MySQL REAL (opt-in; ver terapia-fisica/valoraciones/testing/integracion.ts) de la
 * valoración nutricional: invariante «nunca dos vigentes» con confirmaciones simultáneas, exclusión
 * mutua determinista (se sostiene el candado en otra transacción), rollback real, FK al catálogo,
 * texto largo y auditoría.
 *
 *   RUN_DB_INTEGRATION=1 DB_TEST_NAME=sidnam_scratch_b3 npx jest integration --runInBand
 *
 * Las suites de integración comparten la base y hacen `synchronize`: correrlas EN SERIE (--runInBand).
 */
(INTEGRACION_ACTIVA ? describe : describe.skip)('Valoración nutricional — integración MySQL (RN-03)', () => {
  jest.setTimeout(240_000);
  let ds: DataSource;
  let svc: ValoracionesNutricionalesService;
  let ambulante: DatoFuncionalNutricion;
  let conAyuda: DatoFuncionalNutricion;
  let encamado: DatoFuncionalNutricion;

  beforeAll(async () => {
    ds = await abrirDataSourceDeIntegracion();
    svc = new ValoracionesNutricionalesService(ds);
    // Catálogo de datos funcionales (en la app lo siembra CatalogosSeedService al arrancar), todo activo.
    const repo = ds.getRepository(DatoFuncionalNutricion);
    if ((await repo.count()) === 0) await repo.save(DATOS_FUNCIONALES_NUTRICION.map((nombre) => repo.create({ nombre, activo: true })));
    await ds.createQueryBuilder().update(DatoFuncionalNutricion).set({ activo: true }).execute();
    ambulante = await repo.findOneByOrFail({ nombre: 'Ambulante' });
    conAyuda = await repo.findOneByOrFail({ nombre: 'Deambula con ayuda' });
    encamado = await repo.findOneByOrFail({ nombre: 'Encamado' });
  });

  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  const nuevoExp = (): Promise<number> => nuevoExpediente(ds);
  /** Borrador ya completo (listo para confirmar). */
  const borrador = async (expedienteId: number, extra: object = {}): Promise<number> =>
    (await svc.crear(expedienteId, { datoFuncionalId: conAyuda.id, ...extra }, 1)).id;
  const filas = (expedienteId: number) => ds.getRepository(ValoracionNutricional).find({ where: { expedienteId }, order: { id: 'ASC' } });
  const leer = (id: number) => ds.getRepository(ValoracionNutricional).findOneByOrFail({ id });
  const vigentes = (f: ValoracionNutricional[]) => f.filter((x) => x.estado === EstadoValoracion.VIGENTE && !x.anulado);

  describe('INVARIANTE «nunca dos vigentes» (helper común de confirmar)', () => {
    it('10 confirmaciones simultáneas del mismo expediente → exactamente 1 vigente (repetido 5 veces)', async () => {
      for (let ronda = 0; ronda < 5; ronda++) {
        const exp = await nuevoExp();
        const ids: number[] = [];
        for (let i = 0; i < 10; i++) ids.push(await borrador(exp));
        const resultados = await Promise.allSettled(ids.map((id) => svc.confirmar(id, 1)));
        expect(resultados.filter((r) => r.status === 'rejected').map((r: any) => r.reason?.message)).toEqual([]); // ni deadlocks
        const todas = await filas(exp);
        expect(vigentes(todas)).toHaveLength(1);
        expect(todas.filter((f) => f.estado === EstadoValoracion.REEMPLAZADA)).toHaveLength(9);
        expect(todas.filter((f) => f.estado === EstadoValoracion.BORRADOR)).toHaveLength(0);
      }
    });

    it('expedientes DISTINTOS no se bloquean entre sí: 1 vigente por expediente', async () => {
      const exps = await Promise.all([nuevoExp(), nuevoExp(), nuevoExp()]);
      const ids = await Promise.all(exps.map((e) => borrador(e)));
      await Promise.all(ids.map((id) => svc.confirmar(id, 1)));
      for (const e of exps) expect(vigentes(await filas(e))).toHaveLength(1);
    });

    it('confirmar dos veces la MISMA valoración a la vez: una gana, la otra recibe 409', async () => {
      const exp = await nuevoExp();
      const id = await borrador(exp);
      const r = await Promise.allSettled([svc.confirmar(id, 1), svc.confirmar(id, 1)]);
      expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
      expect((r.find((x) => x.status === 'rejected') as PromiseRejectedResult).reason).toBeInstanceOf(ConflictException);
      expect(vigentes(await filas(exp))).toHaveLength(1);
    });

    it('editar (PATCH) ‖ confirmar: nunca se modifica una valoración ya cerrada', async () => {
      for (let i = 0; i < 5; i++) {
        const exp = await nuevoExp();
        const id = await borrador(exp);
        const [patch, conf] = await Promise.allSettled([svc.actualizar(id, { depresion: true }, 2), svc.confirmar(id, 1)]);
        expect(conf.status).toBe('fulfilled');
        const final = await leer(id);
        expect(final.estado).toBe(EstadoValoracion.VIGENTE);
        if (patch.status === 'fulfilled') expect(final.depresion).toBe(true); // el PATCH ocurrió ANTES de cerrarse
        else {
          expect(patch.reason).toBeInstanceOf(ConflictException); // llegó tarde
          expect(final.depresion).toBe(false);
        }
      }
    });

    it('anular ‖ confirmar de la MISMA vigente anterior: nunca quedan dos vigentes no anuladas', async () => {
      for (let i = 0; i < 5; i++) {
        const exp = await nuevoExp();
        const a = await borrador(exp);
        await svc.confirmar(a, 1);
        const b = await borrador(exp);
        await Promise.allSettled([svc.anular(a, 'Error', 3), svc.confirmar(b, 1)]);
        expect(vigentes(await filas(exp)).length).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('EXCLUSIÓN MUTUA determinista: se sostiene el candado en otra transacción y se observa a quién bloquea', () => {
    const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    /** ¿Sigue pendiente la promesa pasado un rato? (si el servicio no bloqueara, ya habría terminado) */
    const sigueEsperando = async (p: Promise<unknown>, ms = 600): Promise<boolean> =>
      (await Promise.race([p.then(() => 'termino', () => 'termino'), esperar(ms).then(() => 'espera')])) === 'espera';

    /** Simula una CONFIRMACIÓN en curso: transacción con la fila de la valoración bloqueada. */
    const abrirCandado = async (id: number) => {
      const qr = ds.createQueryRunner();
      await qr.connect();
      await qr.startTransaction('READ COMMITTED');
      await qr.manager.getRepository(ValoracionNutricional).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      return qr;
    };

    it('una EDICIÓN llega mientras se confirma: espera el candado, ve la valoración vigente y recibe 409', async () => {
      const id = await borrador(await nuevoExp());
      const qr = await abrirCandado(id);
      const edicion = svc.actualizar(id, { depresion: true }, 7);
      edicion.catch(() => undefined);
      expect(await sigueEsperando(edicion)).toBe(true); // BLOQUEADA por el candado de la valoración
      await qr.manager.getRepository(ValoracionNutricional).update(id, { estado: EstadoValoracion.VIGENTE });
      await qr.commitTransaction();
      await qr.release();
      await expect(edicion).rejects.toBeInstanceOf(ConflictException);
      expect((await leer(id)).depresion).toBe(false);
    });

    it('una CONFIRMACIÓN llega mientras se edita: espera y, al terminar la edición, YA ve el dato funcional y confirma', async () => {
      const id = await borrador(await nuevoExp(), { datoFuncionalId: null });
      const qr = await abrirCandado(id); // «edición en curso»: tiene la valoración bloqueada
      const confirmacion = svc.confirmar(id, 5);
      confirmacion.catch(() => undefined);
      expect(await sigueEsperando(confirmacion)).toBe(true); // sin candado, habría respondido 400 (falta datoFuncionalId) al instante
      await qr.manager.getRepository(ValoracionNutricional).update(id, { datoFuncionalId: ambulante.id });
      await qr.commitTransaction();
      await qr.release();
      await expect(confirmacion).resolves.toMatchObject({ estado: EstadoValoracion.VIGENTE, datoFuncionalId: ambulante.id });
    });

    it('una confirmación del MISMO expediente espera a otra en curso (candado del expediente) y la desplaza', async () => {
      const exp = await nuevoExp();
      const a = await borrador(exp);
      const b = await borrador(exp);
      const qr = ds.createQueryRunner();
      await qr.connect();
      await qr.startTransaction('READ COMMITTED');
      // «confirmación de A en curso»: tiene el candado del expediente
      await qr.query('SELECT id_expediente FROM expediente_residente WHERE id_expediente = ? FOR UPDATE', [exp]);
      const confB = svc.confirmar(b, 1);
      confB.catch(() => undefined);
      expect(await sigueEsperando(confB)).toBe(true);
      await qr.manager.getRepository(ValoracionNutricional).update(a, { estado: EstadoValoracion.VIGENTE });
      await qr.commitTransaction();
      await qr.release();
      await confB;
      const todas = await filas(exp);
      expect(vigentes(todas).map((x) => x.id)).toEqual([b]);
      expect(todas.find((x) => x.id === a)?.estado).toBe(EstadoValoracion.REEMPLAZADA); // B vio a A ya vigente y la desplazó
    });
  });

  describe('rollback real, estados y anulación', () => {
    it('faltantes → 400 y rollback real: la vigente anterior sigue vigente y el borrador sigue borrador', async () => {
      const exp = await nuevoExp();
      const vieja = await borrador(exp);
      await svc.confirmar(vieja, 1);
      const incompleto = await borrador(exp, { datoFuncionalId: null, alergiaMedicamentos: true });
      await expect(svc.confirmar(incompleto, 1)).rejects.toMatchObject({
        response: { faltantes: ['datoFuncionalId', 'detalleAlergiaMedicamentos'] },
      });
      expect((await leer(vieja)).estado).toBe(EstadoValoracion.VIGENTE);
      expect((await leer(incompleto)).estado).toBe(EstadoValoracion.BORRADOR);
    });

    it('anular conserva la fila (RN-02) y deja al expediente sin vigente; luego otra confirmación funciona', async () => {
      const exp = await nuevoExp();
      const a = await borrador(exp);
      await svc.confirmar(a, 1);
      await svc.anular(a, 'Cargada por error', 3);
      const anulada = await leer(a);
      expect(anulada).toMatchObject({ anulado: true, motivoAnulacion: 'Cargada por error', anuladoPorId: 3 });
      expect(anulada.fechaAnulacion).toBeInstanceOf(Date);
      expect(vigentes(await filas(exp))).toHaveLength(0);
      await expect(svc.obtenerVigente(exp)).rejects.toMatchObject({ status: 404 });

      const b = await borrador(exp);
      await svc.confirmar(b, 1);
      const todas = await filas(exp);
      expect(vigentes(todas)).toHaveLength(1);
      expect(todas.find((f) => f.id === a)?.estado).toBe(EstadoValoracion.VIGENTE); // la anulada no se toca
    });

    it('historial: lista todo (vigente, reemplazadas, anuladas, borradores); vigente solo la vigente', async () => {
      const exp = await nuevoExp();
      const [a, b, c] = [await borrador(exp), await borrador(exp), await borrador(exp)];
      await svc.confirmar(a, 1);
      await svc.confirmar(b, 1);
      await svc.anular(c, 'x', 1);
      expect(await svc.listar(exp)).toHaveLength(3);
      expect((await svc.obtenerVigente(exp)).id).toBe(b);
    });
  });

  describe('dato funcional (FK al catálogo administrable)', () => {
    it('inactivo/inexistente → 400 al asignarlo; uno desactivado DESPUÉS se sigue resolviendo en las lecturas', async () => {
      const exp = await nuevoExp();
      await ds.getRepository(DatoFuncionalNutricion).update(encamado.id, { activo: false });
      try {
        await expect(svc.crear(exp, { datoFuncionalId: encamado.id }, 1)).rejects.toBeInstanceOf(BadRequestException);
        await expect(svc.crear(exp, { datoFuncionalId: 99999999 }, 1)).rejects.toBeInstanceOf(BadRequestException);
        expect(await filas(exp)).toHaveLength(0);

        // Se asigna mientras estaba activo, se desactiva después: se resuelve y no impide editar otros campos.
        await ds.getRepository(DatoFuncionalNutricion).update(encamado.id, { activo: true });
        const id = await borrador(exp, { datoFuncionalId: encamado.id });
        await svc.confirmar(id, 1);
        await ds.getRepository(DatoFuncionalNutricion).update(encamado.id, { activo: false });
        const d = await svc.obtenerDetalle(id);
        expect(d.datoFuncional).toEqual({ id: encamado.id, nombre: 'Encamado', activo: false });
        expect((await svc.obtenerVigente(exp)).datoFuncional).toEqual({ id: encamado.id, nombre: 'Encamado', activo: false });
        const otro = await borrador(exp);
        await expect(svc.actualizar(otro, { datoFuncionalId: encamado.id }, 1)).rejects.toBeInstanceOf(BadRequestException);
      } finally {
        await ds.getRepository(DatoFuncionalNutricion).update(encamado.id, { activo: true }); // restaurar el catálogo compartido
      }
    });

    it('FK activas: valoración con expediente o dato funcional inexistente falla en la base', async () => {
      const repo = ds.getRepository(ValoracionNutricional);
      await expect(
        repo.insert({ expedienteId: 99999999, fecha: '2026-10-01', usuarioResponsableId: 1 } as any),
      ).rejects.toThrow(/foreign key/i);
      const exp = await nuevoExp();
      await expect(
        repo.insert({ expedienteId: exp, fecha: '2026-10-01', usuarioResponsableId: 1, datoFuncionalId: 99999999 } as any),
      ).rejects.toThrow(/foreign key/i);
    });
  });

  describe('RF-NU-04, texto largo y auditoría', () => {
    it('CA-17: deambula con ayuda + deterioro leve + alergia a penicilina se conserva íntegro y se resuelve en vigente', async () => {
      const exp = await nuevoExp();
      const id = await borrador(exp, {
        estadoCognitivo: EstadoCognitivo.CON_DETERIORO,
        nivelDeterioroCognitivo: 'leve',
        alergiaMedicamentos: true,
        detalleAlergiaMedicamentos: 'Penicilina',
        problemaVisual: true,
      });
      await svc.confirmar(id, 1);
      const v = await svc.obtenerVigente(exp);
      expect(v).toMatchObject({
        estadoCognitivo: 'con_deterioro',
        nivelDeterioroCognitivo: 'leve',
        alergiaMedicamentos: true,
        detalleAlergiaMedicamentos: 'Penicilina',
        problemaVisual: true,
        problemaCavidadOral: false,
        depresion: false,
        ansiedad: false,
        datoFuncional: { id: conAyuda.id, nombre: 'Deambula con ayuda', activo: true },
      });
    });

    it('detalle de alergia de >2000 y de 20000 caracteres con tildes: SIN pérdida ni fragmentación', async () => {
      const exp = await nuevoExp();
      const t2k = 'Alergia a antibióticos betalactámicos, urticaria y disnea ñ áéíóú. '.repeat(40).trim();
      const t20k = 'ñá'.repeat(10000);
      expect(t2k.length).toBeGreaterThan(2000);
      const a = await borrador(exp, { alergiaMedicamentos: true, detalleAlergiaMedicamentos: t2k });
      const b = await borrador(exp, { alergiaMedicamentos: true, detalleAlergiaMedicamentos: t20k });
      expect((await leer(a)).detalleAlergiaMedicamentos).toBe(t2k);
      expect((await leer(b)).detalleAlergiaMedicamentos).toBe(t20k);
      expect((await leer(b)).detalleAlergiaMedicamentos).toHaveLength(20000);
      expect(await filas(exp)).toHaveLength(2); // una fila por valoración, sin segmentos
    });

    it('defaults de la columna: una valoración vacía nace con booleanos false, estadoCognitivo normal y borrador', async () => {
      const exp = await nuevoExp();
      const v = await leer((await svc.crear(exp, {}, 1)).id);
      expect(v).toMatchObject({
        estado: 'borrador',
        problemaVisual: false,
        problemaCavidadOral: false,
        alergiaMedicamentos: false,
        depresion: false,
        ansiedad: false,
        estadoCognitivo: 'normal',
        datoFuncionalId: null,
        detalleAlergiaMedicamentos: null,
        nivelDeterioroCognitivo: null,
      });
    });

    it('expediente inexistente → 404 (no se crea nada)', async () => {
      await expect(svc.crear(99999999, {}, 1)).rejects.toMatchObject({ status: 404 });
    });

    it('auditoría: creadoPorId/modificadoPorId y responsable fijados por el servidor', async () => {
      const exp = await nuevoExp();
      const id = await borrador(exp);
      await svc.actualizar(id, { ansiedad: true }, 8);
      expect(await leer(id)).toMatchObject({ creadoPorId: 1, usuarioResponsableId: 1, modificadoPorId: 8, ansiedad: true });
    });
  });
});
