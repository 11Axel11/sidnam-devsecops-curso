/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call -- base simulada en memoria */
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { EjercicioTestMovimiento } from 'src/modulos/catalogos/entities/catalogos.entities';
import { AplicacionTestMovimiento } from '../entities/aplicacion-test-movimiento.entity';
import { AplicacionTestMovimientoEjercicio } from '../entities/aplicacion-test-movimiento-ejercicio.entity';
import { crearDbSimulada } from '../valoraciones/testing/db-simulada';
import { AplicacionesTestMovimientoService } from './aplicaciones-test-movimiento.service';

/**
 * Servicio del Test de Movimiento contra la base simulada (con ROLLBACK real). Expedientes 1 y 2.
 * «Hoy» = 2026-10-21 (18:00 en Costa Rica = 2026-10-22T00:00Z). Catálogo: 1 Transferencias, 2 Flexiones,
 * 3 Velocidad en marcha (activos) y 4 Equilibrio (DESACTIVADO).
 */
const HOY = '2026-10-21';
const AHORA = new Date('2026-10-22T00:00:00.000Z');
const USUARIO = 9;

const escenario = () => {
  const db = crearDbSimulada([1, 2]);
  db.insertar(EjercicioTestMovimiento, { id: 1, nombre: 'Transferencias de sedente a bípedo', activo: true });
  db.insertar(EjercicioTestMovimiento, { id: 2, nombre: 'Flexiones de hombro', activo: true });
  db.insertar(EjercicioTestMovimiento, { id: 3, nombre: 'Velocidad en marcha', activo: true });
  db.insertar(EjercicioTestMovimiento, { id: 4, nombre: 'Equilibrio', activo: false });
  const svc = new AplicacionesTestMovimientoService(db.dataSource);
  const cabeceras = () => db.filas(AplicacionTestMovimiento) as AplicacionTestMovimiento[];
  const detalles = () => db.filas(AplicacionTestMovimientoEjercicio) as AplicacionTestMovimientoEjercicio[];
  return { db, svc, cabeceras, detalles };
};

const ej = (ejercicioId: number, parcial: object = {}) => ({ ejercicioId, modalidad: 'Con apoyo', resultado: 'Lo realiza', ...parcial });
const completa = (extra: object = {}) => ({ ejercicios: [ej(1), ej(2), ej(3)], ...extra });

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

describe('AplicacionesTestMovimientoService', () => {
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
    it('registra cabecera + un detalle por ejercicio activo, con la fecha de hoy (Costa Rica) y el responsable del token', async () => {
      const { svc, cabeceras, detalles } = escenario();
      const a = await svc.crear(1, completa(), USUARIO);
      expect(a).toMatchObject({ expedienteId: 1, fecha: HOY, usuarioResponsableId: USUARIO, anulado: false, creadoPorId: USUARIO });
      expect(a.ejercicios.map((e) => [e.ejercicioId, e.ejercicio.nombre])).toEqual([
        [1, 'Transferencias de sedente a bípedo'],
        [2, 'Flexiones de hombro'],
        [3, 'Velocidad en marcha'],
      ]);
      expect(cabeceras()).toHaveLength(1);
      expect(detalles()).toHaveLength(3);
      expect(detalles().every((d) => d.creadoPorId === USUARIO && d.aplicacionId === a.id)).toBe(true);
    });

    it('guarda modalidad, modificación (opcional → null) y resultado tal cual se describen', async () => {
      const { svc } = escenario();
      const a = await svc.crear(
        1,
        { ejercicios: [ej(1, { modalidad: 'Asistido', modificacion: 'Silla alta', resultado: 'Parcial' }), ej(2), ej(3, { modificacion: null })] },
        USUARIO,
      );
      expect(a.ejercicios[0]).toMatchObject({ modalidad: 'Asistido', modificacion: 'Silla alta', resultado: 'Parcial' });
      expect(a.ejercicios[1].modificacion).toBeNull();
      expect(a.ejercicios[2].modificacion).toBeNull();
    });

    it('acepta una fecha pasada y rechaza la futura o inexistente', async () => {
      const { svc, cabeceras } = escenario();
      await expect(svc.crear(1, completa({ fecha: '2026-04-21' }), USUARIO)).resolves.toMatchObject({ fecha: '2026-04-21' });
      expect(await erroresDe(svc.crear(1, completa({ fecha: '2026-10-22' }), USUARIO))).toEqual([
        'La fecha de la aplicación no puede ser posterior a hoy',
      ]);
      expect(await erroresDe(svc.crear(1, completa({ fecha: '2026-02-30' }), USUARIO))).toEqual([
        'La fecha de la aplicación no es una fecha válida (formato YYYY-MM-DD)',
      ]);
      expect(cabeceras()).toHaveLength(1);
    });

    it('CA-10: dos aplicaciones con seis meses de diferencia se conservan ambas', async () => {
      const { svc, cabeceras } = escenario();
      await svc.crear(1, completa({ fecha: '2026-04-21' }), USUARIO);
      await svc.crear(1, completa({ fecha: HOY }), USUARIO);
      expect(cabeceras()).toHaveLength(2);
    });

    it('falta un ejercicio activo ⇒ 400 y NO se guarda nada (todo o nada)', async () => {
      const { svc, cabeceras, detalles } = escenario();
      const errores = await erroresDe(svc.crear(1, { ejercicios: [ej(1), ej(2)] }, USUARIO));
      expect(errores).toEqual(['falta el ejercicioId 3 ("Velocidad en marcha"): la aplicación debe incluir todos los ejercicios activos']);
      expect(cabeceras()).toHaveLength(0);
      expect(detalles()).toHaveLength(0);
    });

    it('ejercicio inexistente o desactivado ⇒ 400 (y no se guarda ninguno aunque los demás sean válidos)', async () => {
      const { svc, cabeceras, detalles } = escenario();
      expect(await erroresDe(svc.crear(1, completa({ ejercicios: [ej(1), ej(2), ej(3), ej(99)] }), USUARIO))).toEqual([
        'ejercicioId 99 no existe en el catálogo',
      ]);
      expect(await erroresDe(svc.crear(1, { ejercicios: [ej(1), ej(2), ej(3), ej(4)] }, USUARIO))).toEqual([
        'ejercicioId 4 ("Equilibrio") está desactivado',
      ]);
      expect(cabeceras()).toHaveLength(0);
      expect(detalles()).toHaveLength(0);
    });

    it('junta fecha y ejercicios en un solo 400', async () => {
      const { svc } = escenario();
      const errores = await erroresDe(svc.crear(1, { fecha: '2999-01-01', ejercicios: [ej(99)] }, USUARIO));
      expect(errores).toHaveLength(5); // fecha + inexistente + 3 faltantes
    });

    it('un ejercicio agregado al catálogo pasa a ser obligatorio sin tocar el código', async () => {
      const { svc, db } = escenario();
      db.insertar(EjercicioTestMovimiento, { id: 5, nombre: 'Equilibrio estático', activo: true });
      expect(await erroresDe(svc.crear(1, completa(), USUARIO))).toHaveLength(1);
      await expect(svc.crear(1, { ejercicios: [ej(1), ej(2), ej(3), ej(5)] }, USUARIO)).resolves.toBeDefined();
    });

    it('si falla la escritura del detalle, la cabecera tampoco queda (rollback real)', async () => {
      const { svc, db, cabeceras, detalles } = escenario();
      const original = db.dataSource.transaction;
      db.dataSource.transaction = (iso: string, cb: (m: any) => Promise<unknown>) =>
        original(iso, (m: any) =>
          cb({
            ...m,
            getRepository: (e: unknown) =>
              e === AplicacionTestMovimientoEjercicio
                ? { ...m.getRepository(e), save: () => Promise.reject(new Error('fallo simulado')) }
                : m.getRepository(e),
          }),
        );
      await expect(svc.crear(1, completa(), USUARIO)).rejects.toThrow('fallo simulado');
      expect(cabeceras()).toHaveLength(0);
      expect(detalles()).toHaveLength(0);
    });

    it('expediente inexistente ⇒ 404 y no se crea nada (RN-01)', async () => {
      const { svc, cabeceras } = escenario();
      await expect(svc.crear(99, completa(), USUARIO)).rejects.toBeInstanceOf(NotFoundException);
      expect(cabeceras()).toHaveLength(0);
    });

    it('el responsable sale del token; los campos del cliente se ignoran', async () => {
      const { svc } = escenario();
      const a = await svc.crear(1, completa({ expedienteId: 2, usuarioResponsableId: 500, anulado: true, creadoPorId: 500 }), USUARIO);
      expect(a).toMatchObject({ expedienteId: 1, usuarioResponsableId: USUARIO, anulado: false, creadoPorId: USUARIO });
    });
  });

  describe('listar y detalle', () => {
    it('expediente inexistente ⇒ 404; rango inválido ⇒ 400; sin aplicaciones ⇒ []', async () => {
      const { svc } = escenario();
      await expect(svc.listar(99, {})).rejects.toBeInstanceOf(NotFoundException);
      expect(await erroresDe(svc.listar(1, { desde: '2026-10-22', hasta: '2026-10-21' }))).toEqual(['desde no puede ser posterior a hasta']);
      await expect(svc.listar(1, {})).resolves.toEqual([]);
    });

    it('de la más reciente a la más antigua, cada una con sus ejercicios alineables por ejercicioId (CA-10)', async () => {
      const { svc } = escenario();
      const vieja = await svc.crear(1, completa({ fecha: '2026-04-21' }), USUARIO);
      const nueva = await svc.crear(1, { fecha: HOY, ejercicios: [ej(3, { resultado: 'Mejor'}), ej(1), ej(2)] }, USUARIO);
      const r = await svc.listar(1, {});
      expect(r.map((a) => a.id)).toEqual([nueva.id, vieja.id]);
      expect(r[0].ejercicios.map((e) => e.ejercicioId)).toEqual([1, 2, 3]);
      expect(r[0].ejercicios[2].resultado).toBe('Mejor');
      expect(r[1].ejercicios).toHaveLength(3);
    });

    it('filtra por desde/hasta (inclusivos) y solo trae las del expediente', async () => {
      const { svc } = escenario();
      await svc.crear(1, completa({ fecha: '2026-01-10' }), USUARIO);
      const b = await svc.crear(1, completa({ fecha: '2026-04-21' }), USUARIO);
      await svc.crear(1, completa({ fecha: '2026-10-01' }), USUARIO);
      await svc.crear(2, completa({ fecha: '2026-04-21' }), USUARIO);
      expect((await svc.listar(1, { desde: '2026-04-21', hasta: '2026-04-21' })).map((a) => a.id)).toEqual([b.id]);
      expect(await svc.listar(1, {})).toHaveLength(3);
      expect(await svc.listar(1, { hasta: '2026-01-10' })).toHaveLength(1);
    });

    it('por defecto EXCLUYE las anuladas; con incluirAnulados=true las trae', async () => {
      const { svc } = escenario();
      const a = await svc.crear(1, completa({ fecha: '2026-04-21' }), USUARIO);
      const b = await svc.crear(1, completa({ fecha: HOY }), USUARIO);
      await svc.anular(b.id, 'Error', 11);
      expect((await svc.listar(1, {})).map((x) => x.id)).toEqual([a.id]);
      expect((await svc.listar(1, { incluirAnulados: true })).map((x) => x.id)).toEqual([b.id, a.id]);
    });

    it('un ejercicio desactivado DESPUÉS sigue resolviéndose en el historial (con su activo actual)', async () => {
      const { svc, db } = escenario();
      const a = await svc.crear(1, completa(), USUARIO);
      db.filas(EjercicioTestMovimiento).find((e: any) => e.id === 2).activo = false;
      const [r] = await svc.listar(1, {});
      expect(r.id).toBe(a.id);
      expect(r.ejercicios[1].ejercicio).toEqual({ id: 2, nombre: 'Flexiones de hombro', activo: false });
    });

    it('detalle: cualquier estado (incluida anulada); inexistente ⇒ 404', async () => {
      const { svc } = escenario();
      const a = await svc.crear(1, completa(), USUARIO);
      await svc.anular(a.id, 'x', 11);
      await expect(svc.obtenerDetalle(a.id)).resolves.toMatchObject({ id: a.id, anulado: true });
      await expect(svc.obtenerDetalle(99)).rejects.toThrow('Aplicación del test de movimiento 99 no existe');
    });
  });

  describe('anular', () => {
    it('anula la cabecera con motivo, usuario y fecha (el detalle no se toca) y toma el candado', async () => {
      const { svc, db, detalles } = escenario();
      const a = await svc.crear(1, completa(), USUARIO);
      const r = await svc.anular(a.id, 'Se aplicó al residente equivocado', 11);
      expect(r).toMatchObject({ anulado: true, motivoAnulacion: 'Se aplicó al residente equivocado', anuladoPorId: 11, modificadoPorId: 11 });
      expect(r.ejercicios).toHaveLength(3);
      expect(detalles()).toHaveLength(3);
      expect(db.log).toContain(`lock:AplicacionTestMovimiento:${a.id}`);
    });

    it('inexistente ⇒ 404; ya anulada ⇒ 409 y se conserva la anulación original', async () => {
      const { svc } = escenario();
      await expect(svc.anular(99, 'x', 11)).rejects.toBeInstanceOf(NotFoundException);
      const a = await svc.crear(1, completa(), USUARIO);
      await svc.anular(a.id, 'primera', 11);
      await expect(svc.anular(a.id, 'segunda', 12)).rejects.toBeInstanceOf(ConflictException);
      expect((await svc.obtenerDetalle(a.id)).motivoAnulacion).toBe('primera');
    });
  });
});
