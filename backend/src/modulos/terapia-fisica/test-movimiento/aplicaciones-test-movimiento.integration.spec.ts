/* eslint-disable @typescript-eslint/no-unsafe-member-access -- prueba contra MySQL real */
import 'reflect-metadata';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { generarTextoLargo } from 'src/common/testing/texto-largo.helper';
import { EjercicioTestMovimiento } from 'src/modulos/catalogos/entities/catalogos.entities';
import { EJERCICIOS_TEST_MOVIMIENTO } from 'src/modulos/catalogos/seed/catalogos-iniciales';
import { AplicacionTestMovimiento } from '../entities/aplicacion-test-movimiento.entity';
import { AplicacionTestMovimientoEjercicio } from '../entities/aplicacion-test-movimiento-ejercicio.entity';
import {
  abrirDataSourceDeIntegracion,
  INTEGRACION_ACTIVA,
  nuevoExpediente,
} from '../valoraciones/testing/integracion';
import { AplicacionesTestMovimientoService } from './aplicaciones-test-movimiento.service';

/**
 * INTEGRACIÓN con MySQL REAL (opt-in; ver valoraciones/testing/integracion.ts) del Test de Movimiento:
 * cabecera + detalle en una transacción real (todo o nada), catálogo dinámico, respaldo UNIQUE/FK,
 * texto largo, anulación (incluida la simultánea) y esquema.
 *
 *   RUN_DB_INTEGRATION=1 DB_TEST_NAME=sidnam_scratch_b4 npx jest integration --runInBand
 *
 * Las suites de integración comparten la base y hacen `synchronize`: correrlas EN SERIE (--runInBand).
 */
(INTEGRACION_ACTIVA ? describe : describe.skip)('Test de movimiento — integración MySQL', () => {
  jest.setTimeout(240_000);
  let ds: DataSource;
  let svc: AplicacionesTestMovimientoService;
  let transferencias: EjercicioTestMovimiento;
  let flexiones: EjercicioTestMovimiento;
  let velocidad: EjercicioTestMovimiento;
  const extras: number[] = [];

  /** Deja activos EXACTAMENTE los tres ejercicios iniciales (precondición de esta suite). */
  const fijarCatalogo = async () => {
    const repo = ds.getRepository(EjercicioTestMovimiento);
    if ((await repo.count()) === 0) await repo.save(EJERCICIOS_TEST_MOVIMIENTO.map((nombre) => repo.create({ nombre, activo: true })));
    for (const e of await repo.find()) {
      const debeEstarActivo = EJERCICIOS_TEST_MOVIMIENTO.includes(e.nombre);
      if (e.activo !== debeEstarActivo) await repo.update(e.id, { activo: debeEstarActivo });
    }
    transferencias = await repo.findOneByOrFail({ nombre: 'Transferencias de sedente a bípedo' });
    flexiones = await repo.findOneByOrFail({ nombre: 'Flexiones de hombro' });
    velocidad = await repo.findOneByOrFail({ nombre: 'Velocidad en marcha' });
  };

  beforeAll(async () => {
    ds = await abrirDataSourceDeIntegracion();
    svc = new AplicacionesTestMovimientoService(ds);
    await fijarCatalogo();
  });

  afterAll(async () => {
    if (ds?.isInitialized) {
      // Los ejercicios de prueba que se agregaron quedan DESACTIVADOS (nunca se borra del catálogo).
      for (const id of extras) await ds.getRepository(EjercicioTestMovimiento).update(id, { activo: false });
      await ds.getRepository(EjercicioTestMovimiento).update(flexiones.id, { activo: true });
      await ds.destroy();
    }
  });

  const ej = (e: EjercicioTestMovimiento, parcial: object = {}) => ({
    ejercicioId: e.id,
    modalidad: 'Con apoyo de bastón',
    resultado: 'Lo realiza',
    ...parcial,
  });
  const completa = (extra: object = {}) => ({ ejercicios: [ej(transferencias), ej(flexiones), ej(velocidad)], ...extra });
  const contar = async (expedienteId: number) => ({
    cabeceras: await ds.getRepository(AplicacionTestMovimiento).count({ where: { expedienteId } }),
    detalles: Number(
      (
        await ds.query(
          `SELECT COUNT(*) AS n FROM aplicacion_test_movimiento_ejercicio d
             JOIN aplicacion_test_movimiento a ON a.id = d.aplicacion_id WHERE a.expediente_id = ?`,
          [expedienteId],
        )
      )[0].n,
    ),
  });

  describe('registro de una aplicación', () => {
    it('CA-10: cabecera + los tres ejercicios; el texto descriptivo vuelve idéntico', async () => {
      const exp = await nuevoExpediente(ds);
      const a = await svc.crear(
        exp,
        {
          fecha: '2026-04-21',
          ejercicios: [
            ej(transferencias, { modalidad: 'Asistido', modificacion: 'Silla alta', resultado: 'Lo logra en 12 s' }),
            ej(flexiones, { modalidad: 'x'.repeat(255) }),
            ej(velocidad),
          ],
        },
        7,
      );
      expect(a).toMatchObject({ expedienteId: exp, fecha: '2026-04-21', usuarioResponsableId: 7, anulado: false });
      const [leida] = await svc.listar(exp, {});
      expect(leida.id).toBe(a.id);
      expect(leida.ejercicios).toHaveLength(3);
      expect(leida.ejercicios[0]).toMatchObject({ modalidad: 'Asistido', modificacion: 'Silla alta', resultado: 'Lo logra en 12 s' });
      expect(leida.ejercicios[1].modalidad).toBe('x'.repeat(255));
      expect(leida.ejercicios[2].modificacion).toBeNull();
      expect(leida.ejercicios.map((e) => e.ejercicio.nombre)).toEqual(EJERCICIOS_TEST_MOVIMIENTO);
    });

    it('dos aplicaciones del mismo residente con seis meses de diferencia se conservan y se comparan por ejercicio', async () => {
      const exp = await nuevoExpediente(ds);
      await svc.crear(exp, completa({ fecha: '2026-04-21' }), 7);
      await svc.crear(exp, { fecha: '2026-10-21', ejercicios: [ej(velocidad, { resultado: 'Mejoró' }), ej(transferencias), ej(flexiones)] }, 7);
      const [nueva, vieja] = await svc.listar(exp, {});
      expect([nueva.fecha, vieja.fecha]).toEqual(['2026-10-21', '2026-04-21']);
      expect(nueva.ejercicios[2].resultado).toBe('Mejoró');
      expect(vieja.ejercicios[2].resultado).toBe('Lo realiza');
      expect(await contar(exp)).toEqual({ cabeceras: 2, detalles: 6 });
    });

    it('expediente inexistente ⇒ 404 (crear y listar)', async () => {
      await expect(svc.crear(999_999_999, completa(), 7)).rejects.toBeInstanceOf(NotFoundException);
      await expect(svc.listar(999_999_999, {})).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('todo o nada', () => {
    it('validación en bloque: con un ejercicio faltante, inexistente o con fecha futura no queda NADA', async () => {
      const exp = await nuevoExpediente(ds);
      await expect(svc.crear(exp, { ejercicios: [ej(transferencias), ej(flexiones)] }, 7)).rejects.toBeInstanceOf(BadRequestException);
      await expect(svc.crear(exp, completa({ ejercicios: [ej(transferencias), ej(flexiones), ej(velocidad), { ejercicioId: 999_999, modalidad: 'a', resultado: 'b' }] }), 7)).rejects.toBeInstanceOf(BadRequestException);
      await expect(svc.crear(exp, completa({ fecha: '2999-01-01' }), 7)).rejects.toBeInstanceOf(BadRequestException);
      expect(await contar(exp)).toEqual({ cabeceras: 0, detalles: 0 });
    });

    it('si MySQL rechaza un detalle (texto > 255 saltándose el DTO), la cabecera se deshace: rollback real', async () => {
      const exp = await nuevoExpediente(ds);
      const rota = { ejercicios: [ej(transferencias), ej(flexiones, { modalidad: 'x'.repeat(300) }), ej(velocidad)] };
      await expect(svc.crear(exp, rota, 7)).rejects.toThrow();
      expect(await contar(exp)).toEqual({ cabeceras: 0, detalles: 0 });
    });
  });

  describe('catálogo administrable', () => {
    it('un ejercicio ACTIVO nuevo pasa a ser obligatorio; uno desactivado deja de exigirse y de aceptarse; el histórico lo sigue resolviendo', async () => {
      const exp = await nuevoExpediente(ds);
      const antes = await svc.crear(exp, completa({ fecha: '2026-04-21' }), 7);

      const nuevo = await ds.getRepository(EjercicioTestMovimiento).save({ nombre: `Equilibrio estático ${Date.now()}`, activo: true });
      extras.push(nuevo.id);
      await expect(svc.crear(exp, completa(), 7)).rejects.toBeInstanceOf(BadRequestException); // falta el nuevo
      await svc.crear(exp, { ejercicios: [...completa().ejercicios, ej(nuevo)] }, 7);

      await ds.getRepository(EjercicioTestMovimiento).update(nuevo.id, { activo: false });
      await expect(svc.crear(exp, { ejercicios: [...completa().ejercicios, ej(nuevo)] }, 7)).rejects.toBeInstanceOf(BadRequestException); // ya no se acepta
      await svc.crear(exp, completa(), 7); // ya no se exige

      const historial = await svc.listar(exp, {});
      const conNuevo = historial.find((a) => a.ejercicios.length === 4);
      expect(conNuevo?.ejercicios[3].ejercicio).toEqual({ id: nuevo.id, nombre: nuevo.nombre, activo: false });
      expect(historial.find((a) => a.id === antes.id)?.ejercicios).toHaveLength(3);
    });
  });

  describe('respaldo en la base', () => {
    it('UNIQUE (aplicacion_id, ejercicio_id): no admite el mismo ejercicio dos veces en una aplicación', async () => {
      const exp = await nuevoExpediente(ds);
      const a = await svc.crear(exp, completa(), 7);
      await expect(
        ds.getRepository(AplicacionTestMovimientoEjercicio).insert({ aplicacionId: a.id, ejercicioId: flexiones.id, modalidad: 'a', resultado: 'b' }),
      ).rejects.toThrow(/Duplicate entry/);
    });

    it('FK: un detalle con ejercicio o aplicación inexistentes no entra', async () => {
      const exp = await nuevoExpediente(ds);
      const a = await svc.crear(exp, completa(), 7);
      const repo = ds.getRepository(AplicacionTestMovimientoEjercicio);
      await expect(repo.insert({ aplicacionId: a.id, ejercicioId: 999_999, modalidad: 'a', resultado: 'b' })).rejects.toThrow(/foreign key/i);
      await expect(repo.insert({ aplicacionId: 999_999, ejercicioId: flexiones.id, modalidad: 'a', resultado: 'b' })).rejects.toThrow(/foreign key/i);
    });
  });

  describe('texto largo y filtros', () => {
    it('el motivo de anulación de 2000 caracteres vuelve idéntico', async () => {
      const exp = await nuevoExpediente(ds);
      const a = await svc.crear(exp, completa(), 7);
      const motivo = generarTextoLargo(2000);
      await svc.anular(a.id, motivo, 8);
      expect((await svc.obtenerDetalle(a.id)).motivoAnulacion).toBe(motivo);
    });

    it('desde/hasta inclusivos y anuladas excluidas por defecto', async () => {
      const exp = await nuevoExpediente(ds);
      const a = await svc.crear(exp, completa({ fecha: '2026-01-10' }), 7);
      const b = await svc.crear(exp, completa({ fecha: '2026-04-21' }), 7);
      const c = await svc.crear(exp, completa({ fecha: '2026-10-01' }), 7);
      expect((await svc.listar(exp, { desde: '2026-01-10', hasta: '2026-04-21' })).map((x) => x.id)).toEqual([b.id, a.id]);
      await svc.anular(c.id, 'Error', 8);
      expect((await svc.listar(exp, {})).map((x) => x.id)).toEqual([b.id, a.id]);
      expect((await svc.listar(exp, { incluirAnulados: true })).map((x) => x.id)).toEqual([c.id, b.id, a.id]);
    });
  });

  describe('anulación (RN-02): nunca DELETE', () => {
    it('anula la cabecera con motivo, usuario y fecha; el detalle queda; segunda vez ⇒ 409', async () => {
      const exp = await nuevoExpediente(ds);
      const a = await svc.crear(exp, completa(), 7);
      const r = await svc.anular(a.id, 'Residente equivocado', 8);
      expect(r).toMatchObject({ anulado: true, motivoAnulacion: 'Residente equivocado', anuladoPorId: 8, creadoPorId: 7 });
      expect(r.fechaAnulacion).toBeInstanceOf(Date);
      expect(await contar(exp)).toEqual({ cabeceras: 1, detalles: 3 });
      await expect(svc.anular(a.id, 'otra vez', 9)).rejects.toBeInstanceOf(ConflictException);
      expect((await svc.obtenerDetalle(a.id)).motivoAnulacion).toBe('Residente equivocado');
    });

    it('aplicación inexistente ⇒ 404', async () => {
      await expect(svc.anular(999_999_999, 'x', 8)).rejects.toBeInstanceOf(NotFoundException);
      await expect(svc.obtenerDetalle(999_999_999)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('dos anulaciones SIMULTÁNEAS de la misma aplicación: una gana y la otra recibe 409', async () => {
      for (let ronda = 0; ronda < 5; ronda++) {
        const exp = await nuevoExpediente(ds);
        const a = await svc.crear(exp, completa(), 7);
        const r = await Promise.allSettled([svc.anular(a.id, 'motivo A', 8), svc.anular(a.id, 'motivo B', 9)]);
        expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
        expect((r.find((x) => x.status === 'rejected') as PromiseRejectedResult).reason).toBeInstanceOf(ConflictException);
        const ganadora = r.findIndex((x) => x.status === 'fulfilled');
        expect((await svc.obtenerDetalle(a.id)).motivoAnulacion).toBe(ganadora === 0 ? 'motivo A' : 'motivo B');
      }
    });
  });

  describe('esquema (synchronize)', () => {
    it('índice (expediente_id, fecha) y FK de la cabecera a expediente_residente', async () => {
      const indices: { Key_name: string; Column_name: string; Seq_in_index: number }[] = await ds.query('SHOW INDEX FROM aplicacion_test_movimiento');
      const columnas = indices
        .filter((i) => i.Key_name === 'idx_aplicacion_test_movimiento_expediente_fecha')
        .sort((a, b) => a.Seq_in_index - b.Seq_in_index)
        .map((i) => i.Column_name);
      expect(columnas).toEqual(['expediente_id', 'fecha']);
      const fks: { t: string }[] = await ds.query(
        `SELECT REFERENCED_TABLE_NAME AS t FROM information_schema.KEY_COLUMN_USAGE
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'aplicacion_test_movimiento' AND REFERENCED_TABLE_NAME IS NOT NULL`,
      );
      expect(fks.map((f) => f.t)).toEqual(['expediente_residente']);
    });

    it('detalle: UNIQUE (aplicacion_id, ejercicio_id), FKs a la cabecera y al catálogo, modificación nullable', async () => {
      const indices: { Key_name: string; Column_name: string; Non_unique: number; Seq_in_index: number }[] = await ds.query(
        'SHOW INDEX FROM aplicacion_test_movimiento_ejercicio',
      );
      const unico = indices
        .filter((i) => i.Key_name === 'uq_aplicacion_test_ejercicio')
        .sort((a, b) => a.Seq_in_index - b.Seq_in_index);
      expect(unico.map((i) => i.Column_name)).toEqual(['aplicacion_id', 'ejercicio_id']);
      expect(unico[0].Non_unique).toBe(0);
      const fks: { t: string }[] = await ds.query(
        `SELECT REFERENCED_TABLE_NAME AS t FROM information_schema.KEY_COLUMN_USAGE
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'aplicacion_test_movimiento_ejercicio' AND REFERENCED_TABLE_NAME IS NOT NULL`,
      );
      expect(fks.map((f) => f.t).sort()).toEqual(['aplicacion_test_movimiento', 'ejercicio_test_movimiento']);
      const cols: { Field: string; Type: string; Null: string }[] = await ds.query('SHOW COLUMNS FROM aplicacion_test_movimiento_ejercicio');
      const c = (n: string) => cols.find((x) => x.Field === n);
      expect(c('modalidad')).toMatchObject({ Type: 'varchar(255)', Null: 'NO' });
      expect(c('modificacion')).toMatchObject({ Type: 'varchar(255)', Null: 'YES' });
      expect(c('resultado')).toMatchObject({ Type: 'varchar(255)', Null: 'NO' });
    });
  });
});
