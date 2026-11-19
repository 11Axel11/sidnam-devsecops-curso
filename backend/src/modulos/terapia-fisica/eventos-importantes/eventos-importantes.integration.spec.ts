/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return -- prueba contra MySQL real */
import 'reflect-metadata';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { generarTextoLargo } from 'src/common/testing/texto-largo.helper';
import { MAX_TEXTO_LIBRE } from 'src/common/validators/texto-libre.decorator';
import { TipoEventoImportante } from 'src/modulos/catalogos/entities/catalogos.entities';
import { TIPOS_EVENTO_IMPORTANTE } from 'src/modulos/catalogos/seed/catalogos-iniciales';
import { EventoImportanteTf } from '../entities/evento-importante-tf.entity';
import {
  abrirDataSourceDeIntegracion,
  INTEGRACION_ACTIVA,
  nuevoExpediente,
} from '../valoraciones/testing/integracion';
import { EventosImportantesService } from './eventos-importantes.service';

/**
 * INTEGRACIÓN con MySQL REAL (opt-in; ver valoraciones/testing/integracion.ts) de los eventos importantes:
 * fecha-hora ida y vuelta en hora de Costa Rica, filtros por días, «Otro», texto largo, anulación
 * (incluida la simultánea) y esquema.
 *
 *   RUN_DB_INTEGRATION=1 DB_TEST_NAME=sidnam_scratch_b4 npx jest integration --runInBand
 *
 * Las suites de integración comparten la base y hacen `synchronize`: correrlas EN SERIE (--runInBand).
 */
(INTEGRACION_ACTIVA ? describe : describe.skip)('Eventos importantes — integración MySQL', () => {
  jest.setTimeout(240_000);
  let ds: DataSource;
  let svc: EventosImportantesService;
  let caida: TipoEventoImportante;
  let hospitalizacion: TipoEventoImportante;
  let infeccion: TipoEventoImportante;
  let otro: TipoEventoImportante;

  beforeAll(async () => {
    ds = await abrirDataSourceDeIntegracion();
    svc = new EventosImportantesService(ds);
    // Catálogo de tipos (en la app lo siembra CatalogosSeedService al arrancar), todo activo.
    const repo = ds.getRepository(TipoEventoImportante);
    if ((await repo.count()) === 0) await repo.save(TIPOS_EVENTO_IMPORTANTE.map((nombre) => repo.create({ nombre, activo: true })));
    await ds.createQueryBuilder().update(TipoEventoImportante).set({ activo: true }).execute();
    caida = await repo.findOneByOrFail({ nombre: 'Caída' });
    hospitalizacion = await repo.findOneByOrFail({ nombre: 'Hospitalización' });
    infeccion = await repo.findOneByOrFail({ nombre: 'Infección' });
    otro = await repo.findOneByOrFail({ nombre: 'Otro' });
  });

  afterAll(async () => {
    if (ds?.isInitialized) {
      await ds.getRepository(TipoEventoImportante).update(infeccion.id, { activo: true });
      await ds.destroy();
    }
  });

  const leer = (id: number) => ds.getRepository(EventoImportanteTf).findOneByOrFail({ id });
  const crudo = async (id: number): Promise<string> =>
    (await ds.query('SELECT CAST(fechaHora AS CHAR) AS f FROM evento_importante_tf WHERE id = ?', [id]))[0].f;

  describe('fecha-hora en hora de Costa Rica', () => {
    it('sin zona se guarda como hora de Costa Rica y vuelve al mismo instante', async () => {
      const exp = await nuevoExpediente(ds);
      const e = await svc.crear(exp, { tipoEventoId: caida.id, fechaHora: '2026-10-21T14:30' }, 7);
      expect(await crudo(e.id)).toBe('2026-10-21 14:30:00'); // lo que ve quien consulta la tabla: hora de Costa Rica
      expect((await leer(e.id)).fechaHora.toISOString()).toBe('2026-10-21T20:30:00.000Z');
    });

    it('con zona explícita se convierte a hora de Costa Rica', async () => {
      const exp = await nuevoExpediente(ds);
      const e = await svc.crear(exp, { tipoEventoId: caida.id, fechaHora: '2026-10-21T20:30:00Z' }, 7);
      expect(await crudo(e.id)).toBe('2026-10-21 14:30:00');
    });

    it('sin fechaHora usa ahora', async () => {
      const exp = await nuevoExpediente(ds);
      const antes = Date.now();
      const e = await svc.crear(exp, { tipoEventoId: caida.id }, 7);
      expect(Math.abs((await leer(e.id)).fechaHora.getTime() - antes)).toBeLessThan(5000);
    });

    it('fecha-hora futura ⇒ 400 y nada llega a la base', async () => {
      const exp = await nuevoExpediente(ds);
      await expect(svc.crear(exp, { tipoEventoId: caida.id, fechaHora: '2999-01-01T10:00' }, 7)).rejects.toBeInstanceOf(BadRequestException);
      expect(await ds.getRepository(EventoImportanteTf).count({ where: { expedienteId: exp } })).toBe(0);
    });
  });

  describe('tipo del catálogo y «Otro»', () => {
    it('«Otro» exige descripción; con descripción se guarda', async () => {
      const exp = await nuevoExpediente(ds);
      await expect(svc.crear(exp, { tipoEventoId: otro.id }, 7)).rejects.toBeInstanceOf(BadRequestException);
      const e = await svc.crear(exp, { tipoEventoId: otro.id, descripcion: 'Mareo al levantarse' }, 7);
      expect((await leer(e.id)).descripcion).toBe('Mareo al levantarse');
    });

    it('tipo desactivado se rechaza al registrar, pero los eventos históricos lo siguen resolviendo', async () => {
      const exp = await nuevoExpediente(ds);
      const previo = await svc.crear(exp, { tipoEventoId: infeccion.id, fechaHora: '2026-09-01T10:00' }, 7);
      await ds.getRepository(TipoEventoImportante).update(infeccion.id, { activo: false });
      try {
        await expect(svc.crear(exp, { tipoEventoId: infeccion.id }, 7)).rejects.toBeInstanceOf(BadRequestException);
        const [e] = await svc.listar(exp, {});
        expect(e.id).toBe(previo.id);
        expect(e.tipoEvento).toEqual({ id: infeccion.id, nombre: 'Infección', activo: false });
      } finally {
        await ds.getRepository(TipoEventoImportante).update(infeccion.id, { activo: true });
      }
    });

    it('tipo inexistente ⇒ 400 (no un 500 por la FK)', async () => {
      const exp = await nuevoExpediente(ds);
      await expect(svc.crear(exp, { tipoEventoId: 999_999 }, 7)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('texto largo (CA-06): sin fragmentar', () => {
    it('descripción de 2500 y de 20 000 caracteres vuelve idéntica', async () => {
      const exp = await nuevoExpediente(ds);
      for (const n of [2500, MAX_TEXTO_LIBRE]) {
        const texto = generarTextoLargo(n);
        const e = await svc.crear(exp, { tipoEventoId: caida.id, fechaHora: '2026-10-21T10:00', descripcion: texto }, 7);
        expect((await leer(e.id)).descripcion).toBe(texto);
      }
    });

    it('el motivo de anulación de 2000 caracteres vuelve idéntico', async () => {
      const exp = await nuevoExpediente(ds);
      const e = await svc.crear(exp, { tipoEventoId: caida.id }, 7);
      const motivo = generarTextoLargo(2000);
      await svc.anular(e.id, motivo, 8);
      expect((await leer(e.id)).motivoAnulacion).toBe(motivo);
    });
  });

  describe('bitácora (CA-07) y filtros', () => {
    it('una caída y una hospitalización en fechas distintas: de la más reciente a la más antigua, filtrables por tipo', async () => {
      const exp = await nuevoExpediente(ds);
      const a = await svc.crear(exp, { tipoEventoId: caida.id, fechaHora: '2026-09-01T09:00' }, 7);
      const b = await svc.crear(exp, { tipoEventoId: hospitalizacion.id, fechaHora: '2026-10-05T16:00' }, 7);
      expect((await svc.listar(exp, {})).map((e) => e.id)).toEqual([b.id, a.id]);
      expect((await svc.listar(exp, { tipoEventoId: caida.id })).map((e) => e.id)).toEqual([a.id]);
    });

    it('desde/hasta inclusivos por días de Costa Rica, en el borde de la medianoche', async () => {
      const exp = await nuevoExpediente(ds);
      const antes = await svc.crear(exp, { tipoEventoId: caida.id, fechaHora: '2026-10-20T23:59:59' }, 7);
      const inicio = await svc.crear(exp, { tipoEventoId: caida.id, fechaHora: '2026-10-21T00:00:00' }, 7);
      const fin = await svc.crear(exp, { tipoEventoId: caida.id, fechaHora: '2026-10-21T23:59:59' }, 7);
      const despues = await svc.crear(exp, { tipoEventoId: caida.id, fechaHora: '2026-10-22T00:00:00' }, 7);
      expect((await svc.listar(exp, { desde: '2026-10-21', hasta: '2026-10-21' })).map((e) => e.id)).toEqual([fin.id, inicio.id]);
      expect((await svc.listar(exp, { hasta: '2026-10-20' })).map((e) => e.id)).toEqual([antes.id]);
      expect((await svc.listar(exp, { desde: '2026-10-22' })).map((e) => e.id)).toEqual([despues.id]);
    });

    it('por defecto excluye los anulados; con incluirAnulados=true los trae', async () => {
      const exp = await nuevoExpediente(ds);
      const a = await svc.crear(exp, { tipoEventoId: caida.id, fechaHora: '2026-09-01T09:00' }, 7);
      const b = await svc.crear(exp, { tipoEventoId: caida.id, fechaHora: '2026-10-01T09:00' }, 7);
      await svc.anular(b.id, 'Error', 8);
      expect((await svc.listar(exp, {})).map((e) => e.id)).toEqual([a.id]);
      expect((await svc.listar(exp, { incluirAnulados: true })).map((e) => e.id)).toEqual([b.id, a.id]);
    });

    it('expediente inexistente ⇒ 404 (crear y listar)', async () => {
      await expect(svc.crear(999_999_999, { tipoEventoId: caida.id }, 7)).rejects.toBeInstanceOf(NotFoundException);
      await expect(svc.listar(999_999_999, {})).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('anulación (RN-02): nunca DELETE', () => {
    it('anula con motivo, usuario y fecha y deja la fila; segunda vez ⇒ 409', async () => {
      const exp = await nuevoExpediente(ds);
      const e = await svc.crear(exp, { tipoEventoId: caida.id, descripcion: 'Cayó en el baño' }, 7);
      const r = await svc.anular(e.id, 'Residente equivocado', 8);
      expect(r).toMatchObject({ anulado: true, motivoAnulacion: 'Residente equivocado', anuladoPorId: 8, tipoEvento: { nombre: 'Caída' } });

      const fila = await leer(e.id);
      expect(fila).toMatchObject({ anulado: true, descripcion: 'Cayó en el baño', creadoPorId: 7, modificadoPorId: 8 });
      expect(fila.fechaAnulacion).toBeInstanceOf(Date);
      await expect(svc.anular(e.id, 'otra vez', 9)).rejects.toBeInstanceOf(ConflictException);
      expect((await leer(e.id)).motivoAnulacion).toBe('Residente equivocado');
    });

    it('evento inexistente ⇒ 404', async () => {
      await expect(svc.anular(999_999_999, 'x', 8)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('dos anulaciones SIMULTÁNEAS del mismo evento: una gana y la otra recibe 409', async () => {
      for (let ronda = 0; ronda < 5; ronda++) {
        const exp = await nuevoExpediente(ds);
        const e = await svc.crear(exp, { tipoEventoId: caida.id }, 7);
        const r = await Promise.allSettled([svc.anular(e.id, 'motivo A', 8), svc.anular(e.id, 'motivo B', 9)]);
        expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
        expect((r.find((x) => x.status === 'rejected') as PromiseRejectedResult).reason).toBeInstanceOf(ConflictException);
        const ganadora = r.findIndex((x) => x.status === 'fulfilled');
        expect((await leer(e.id)).motivoAnulacion).toBe(ganadora === 0 ? 'motivo A' : 'motivo B');
      }
    });
  });

  describe('esquema (synchronize)', () => {
    it('índice (expediente_id, fechaHora) y FKs a expediente_residente y tipo_evento_importante', async () => {
      const indices: { Key_name: string; Column_name: string; Seq_in_index: number }[] = await ds.query('SHOW INDEX FROM evento_importante_tf');
      const columnas = indices
        .filter((i) => i.Key_name === 'idx_evento_importante_tf_expediente_fecha')
        .sort((a, b) => a.Seq_in_index - b.Seq_in_index)
        .map((i) => i.Column_name);
      expect(columnas).toEqual(['expediente_id', 'fechaHora']);

      const fks: { t: string }[] = await ds.query(
        `SELECT REFERENCED_TABLE_NAME AS t FROM information_schema.KEY_COLUMN_USAGE
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'evento_importante_tf' AND REFERENCED_TABLE_NAME IS NOT NULL`,
      );
      expect(fks.map((f) => f.t).sort()).toEqual(['expediente_residente', 'tipo_evento_importante']);
    });

    it('descripcion es text nullable y fechaHora datetime', async () => {
      const cols: { Field: string; Type: string; Null: string }[] = await ds.query('SHOW COLUMNS FROM evento_importante_tf');
      const c = (n: string) => cols.find((x) => x.Field === n);
      expect(c('descripcion')).toMatchObject({ Type: 'text', Null: 'YES' });
      expect(c('fechaHora')).toMatchObject({ Type: 'datetime', Null: 'NO' });
    });
  });
});
