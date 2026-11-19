/* eslint-disable @typescript-eslint/no-unsafe-argument -- base simulada en memoria */
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { generarTextoLargo } from 'src/common/testing/texto-largo.helper';
import { TipoEventoImportante } from 'src/modulos/catalogos/entities/catalogos.entities';
import { crearDbSimulada } from '../valoraciones/testing/db-simulada';
import { EventoImportanteTf } from '../entities/evento-importante-tf.entity';
import { EventosImportantesService } from './eventos-importantes.service';

/**
 * Servicio de eventos importantes contra la base simulada. Expedientes 1 y 2. «Ahora» se fija en
 * 2026-10-21 18:00 hora de Costa Rica (= 2026-10-22T00:00Z). Catálogo: 1 Caída, 4 Hospitalización,
 * 5 Infección (DESACTIVADA), 6 Otro.
 */
const AHORA = new Date('2026-10-22T00:00:00.000Z');
const USUARIO = 9;

const escenario = () => {
  const db = crearDbSimulada([1, 2]);
  db.insertar(TipoEventoImportante, { id: 1, nombre: 'Caída', activo: true });
  db.insertar(TipoEventoImportante, { id: 4, nombre: 'Hospitalización', activo: true });
  db.insertar(TipoEventoImportante, { id: 5, nombre: 'Infección', activo: false });
  db.insertar(TipoEventoImportante, { id: 6, nombre: 'Otro', activo: true });
  const svc = new EventosImportantesService(db.dataSource);
  const eventos = () => db.filas(EventoImportanteTf) as EventoImportanteTf[];
  const evento = (parcial: Partial<EventoImportanteTf> & { fechaHora: Date }) =>
    db.insertar(EventoImportanteTf, { expedienteId: 1, tipoEventoId: 1, descripcion: null, anulado: false, ...parcial });
  return { db, svc, eventos, evento };
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

describe('EventosImportantesService', () => {
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
    it('sin fechaHora usa AHORA (sin fracción de segundo) y devuelve el tipo resuelto', async () => {
      const { svc } = escenario();
      const e = await svc.crear(1, { tipoEventoId: 1 }, USUARIO);
      expect(e.fechaHora.toISOString()).toBe('2026-10-22T00:00:00.000Z');
      expect(e).toMatchObject({ expedienteId: 1, tipoEventoId: 1, descripcion: null, anulado: false, tipoEvento: { id: 1, nombre: 'Caída', activo: true } });
    });

    it('SIN zona la fecha-hora se interpreta como hora de Costa Rica; con zona se respeta', async () => {
      const { svc } = escenario();
      expect((await svc.crear(1, { tipoEventoId: 1, fechaHora: '2026-10-21T14:30' }, USUARIO)).fechaHora.toISOString()).toBe('2026-10-21T20:30:00.000Z');
      expect((await svc.crear(1, { tipoEventoId: 1, fechaHora: '2026-10-21T14:30:00Z' }, USUARIO)).fechaHora.toISOString()).toBe('2026-10-21T14:30:00.000Z');
      expect((await svc.crear(1, { tipoEventoId: 1, fechaHora: '2026-10-21T14:30:15.987-06:00' }, USUARIO)).fechaHora.toISOString()).toBe('2026-10-21T20:30:15.000Z');
    });

    it('una fecha-hora pasada (evento atrasado) es válida', async () => {
      const { svc } = escenario();
      await expect(svc.crear(1, { tipoEventoId: 4, fechaHora: '2026-01-05T08:00' }, USUARIO)).resolves.toBeDefined();
    });

    it('fecha-hora futura ⇒ 400 y no se guarda nada; dentro de la tolerancia de reloj es válida', async () => {
      const { svc, eventos } = escenario();
      expect(await erroresDe(svc.crear(1, { tipoEventoId: 1, fechaHora: '2026-10-21T19:00' }, USUARIO))).toEqual([
        'La fecha y hora del evento no puede ser posterior a la fecha y hora actual',
      ]);
      expect(eventos()).toHaveLength(0);
      // 18:00 CR es "ahora"; 18:04 queda dentro de los 5 minutos de tolerancia
      await expect(svc.crear(1, { tipoEventoId: 1, fechaHora: '2026-10-21T18:04' }, USUARIO)).resolves.toBeDefined();
    });

    it('fecha-hora que no es una fecha real ⇒ 400', async () => {
      const { svc } = escenario();
      expect((await erroresDe(svc.crear(1, { tipoEventoId: 1, fechaHora: '2026-02-30T10:00' }, USUARIO)))[0]).toMatch(/no es válida/);
    });

    it('tipo inexistente o desactivado ⇒ 400', async () => {
      const { svc, eventos } = escenario();
      expect(await erroresDe(svc.crear(1, { tipoEventoId: 99 }, USUARIO))).toEqual(['tipoEventoId 99 no existe en el catálogo']);
      expect(await erroresDe(svc.crear(1, { tipoEventoId: 5 }, USUARIO))).toEqual(['tipoEventoId 5 ("Infección") está desactivado']);
      expect(eventos()).toHaveLength(0);
    });

    it('«Otro» sin descripción ⇒ 400; con descripción se guarda', async () => {
      const { svc, eventos } = escenario();
      expect(await erroresDe(svc.crear(1, { tipoEventoId: 6 }, USUARIO))).toEqual(['descripcion es obligatoria cuando el tipo es "Otro"']);
      expect(await erroresDe(svc.crear(1, { tipoEventoId: 6, descripcion: '   ' }, USUARIO))).toHaveLength(1);
      expect(eventos()).toHaveLength(0);
      const e = await svc.crear(1, { tipoEventoId: 6, descripcion: 'Mareo al levantarse' }, USUARIO);
      expect(e.descripcion).toBe('Mareo al levantarse');
    });

    it('para los demás tipos la descripción es opcional', async () => {
      const { svc } = escenario();
      await expect(svc.crear(1, { tipoEventoId: 4 }, USUARIO)).resolves.toMatchObject({ descripcion: null });
    });

    it('junta todos los problemas en un solo 400', async () => {
      const { svc } = escenario();
      const errores = await erroresDe(svc.crear(1, { tipoEventoId: 99, fechaHora: '2999-01-01T10:00' }, USUARIO));
      expect(errores).toHaveLength(2);
    });

    it('expediente inexistente ⇒ 404 y no se crea nada (RN-01)', async () => {
      const { svc, eventos } = escenario();
      await expect(svc.crear(99, { tipoEventoId: 1 }, USUARIO)).rejects.toBeInstanceOf(NotFoundException);
      expect(eventos()).toHaveLength(0);
    });

    it('el autor sale del token y los campos del cliente se ignoran', async () => {
      const { svc } = escenario();
      const e = await svc.crear(1, { tipoEventoId: 1, expedienteId: 2, anulado: true, creadoPorId: 500 } as any, USUARIO);
      expect(e).toMatchObject({ expedienteId: 1, anulado: false, creadoPorId: USUARIO });
    });

    it('guarda una descripción larga (> 2000 caracteres) sin fragmentar', async () => {
      const { svc } = escenario();
      const largo = generarTextoLargo(5000);
      expect((await svc.crear(1, { tipoEventoId: 1, descripcion: largo }, USUARIO)).descripcion).toBe(largo);
    });
  });

  describe('listar', () => {
    it('expediente inexistente ⇒ 404; rango inválido ⇒ 400; sin eventos ⇒ []', async () => {
      const { svc } = escenario();
      await expect(svc.listar(99, {})).rejects.toBeInstanceOf(NotFoundException);
      expect(await erroresDe(svc.listar(1, { desde: '2026-10-22', hasta: '2026-10-21' }))).toEqual(['desde no puede ser posterior a hasta']);
      await expect(svc.listar(1, {})).resolves.toEqual([]);
    });

    it('CA-07: una caída y una hospitalización en fechas distintas, de la más reciente a la más antigua', async () => {
      const { svc, evento } = escenario();
      evento({ id: 1, tipoEventoId: 1, fechaHora: new Date('2026-09-01T15:00:00Z') });
      evento({ id: 2, tipoEventoId: 4, fechaHora: new Date('2026-10-05T15:00:00Z') });
      const r = await svc.listar(1, {});
      expect(r.map((e) => [e.id, e.tipoEvento.nombre])).toEqual([
        [2, 'Hospitalización'],
        [1, 'Caída'],
      ]);
    });

    it('mismo instante: el último registrado primero', async () => {
      const { svc, evento } = escenario();
      const t = new Date('2026-10-05T15:00:00Z');
      evento({ id: 1, fechaHora: t });
      evento({ id: 2, fechaHora: t });
      expect((await svc.listar(1, {})).map((e) => e.id)).toEqual([2, 1]);
    });

    it('filtra por tipo', async () => {
      const { svc, evento } = escenario();
      evento({ id: 1, tipoEventoId: 1, fechaHora: new Date('2026-09-01T15:00:00Z') });
      evento({ id: 2, tipoEventoId: 4, fechaHora: new Date('2026-10-05T15:00:00Z') });
      expect((await svc.listar(1, { tipoEventoId: 4 })).map((e) => e.id)).toEqual([2]);
    });

    it('desde/hasta inclusivos, por días de Costa Rica (no de UTC)', async () => {
      const { svc, evento } = escenario();
      evento({ id: 1, fechaHora: new Date('2026-10-21T05:59:59Z') }); // 20/10 23:59:59 en Costa Rica
      evento({ id: 2, fechaHora: new Date('2026-10-21T06:00:00Z') }); // 21/10 00:00:00
      evento({ id: 3, fechaHora: new Date('2026-10-22T05:59:59Z') }); // 21/10 23:59:59
      evento({ id: 4, fechaHora: new Date('2026-10-22T06:00:00Z') }); // 22/10 00:00:00
      expect((await svc.listar(1, { desde: '2026-10-21', hasta: '2026-10-21' })).map((e) => e.id)).toEqual([3, 2]);
      expect((await svc.listar(1, { desde: '2026-10-21' })).map((e) => e.id)).toEqual([4, 3, 2]);
      expect((await svc.listar(1, { hasta: '2026-10-20' })).map((e) => e.id)).toEqual([1]);
    });

    it('por defecto EXCLUYE los anulados; con incluirAnulados=true los trae', async () => {
      const { svc, evento } = escenario();
      evento({ id: 1, fechaHora: new Date('2026-09-01T15:00:00Z') });
      evento({ id: 2, fechaHora: new Date('2026-10-05T15:00:00Z'), anulado: true });
      expect((await svc.listar(1, {})).map((e) => e.id)).toEqual([1]);
      expect((await svc.listar(1, { incluirAnulados: true })).map((e) => e.id)).toEqual([2, 1]);
    });

    it('solo trae los eventos del expediente pedido', async () => {
      const { svc, evento } = escenario();
      evento({ id: 1, fechaHora: new Date('2026-09-01T15:00:00Z') });
      evento({ id: 2, expedienteId: 2, fechaHora: new Date('2026-09-01T15:00:00Z') });
      expect((await svc.listar(1, {})).map((e) => e.id)).toEqual([1]);
    });

    it('un tipo desactivado DESPUÉS sigue resolviéndose en el historial (con su activo actual)', async () => {
      const { svc, evento } = escenario();
      evento({ id: 1, tipoEventoId: 5, fechaHora: new Date('2026-09-01T15:00:00Z') }); // Infección, hoy desactivada
      expect((await svc.listar(1, {}))[0].tipoEvento).toEqual({ id: 5, nombre: 'Infección', activo: false });
    });
  });

  describe('anular', () => {
    it('anula con motivo, usuario y fecha, toma el candado y devuelve el tipo resuelto', async () => {
      const { svc, db } = escenario();
      const e = await svc.crear(1, { tipoEventoId: 1, descripcion: 'Cayó' }, USUARIO);
      const r = await svc.anular(e.id, 'Se registró en el expediente equivocado', 11);
      expect(r).toMatchObject({
        anulado: true,
        motivoAnulacion: 'Se registró en el expediente equivocado',
        anuladoPorId: 11,
        modificadoPorId: 11,
        descripcion: 'Cayó',
        tipoEvento: { id: 1, nombre: 'Caída', activo: true },
      });
      expect(db.log).toContain(`lock:EventoImportanteTf:${e.id}`);
    });

    it('inexistente ⇒ 404; ya anulado ⇒ 409 y se conserva la anulación original', async () => {
      const { svc } = escenario();
      await expect(svc.anular(99, 'x', 11)).rejects.toThrow('Evento importante 99 no existe');
      const e = await svc.crear(1, { tipoEventoId: 1 }, USUARIO);
      await svc.anular(e.id, 'primera', 11);
      await expect(svc.anular(e.id, 'segunda', 12)).rejects.toBeInstanceOf(ConflictException);
      const [anulado] = await svc.listar(1, { incluirAnulados: true });
      expect(anulado).toMatchObject({ motivoAnulacion: 'primera', anuladoPorId: 11 });
    });
  });
});
