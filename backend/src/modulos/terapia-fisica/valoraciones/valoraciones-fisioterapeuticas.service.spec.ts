/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await -- base de datos simulada en memoria */
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { FindOperator } from 'typeorm';
import { EstadoValoracion } from 'src/common/enums/estadoValoracion.enum';
import { hoyCostaRica } from 'src/common/utils/hoyCostaRica';
import { CaracteristicaDolor } from '../enums/caracteristicaDolor.enum';
import { ValoracionesFisioterapeuticasService } from './valoraciones-fisioterapeuticas.service';

/**
 * Base de datos simulada: expedientes + valoraciones en memoria, con un
 * registro de bloqueos (`log`) para verificar el orden de los candados.
 */
const buildDb = (expedientes: number[] = [1]) => {
  const filas: any[] = [];
  const log: string[] = [];
  let seq = 0;

  const coincide = (f: any, where: any) =>
    Object.entries(where).every(([k, v]) => (v instanceof FindOperator ? f[k] !== (v as any).value : f[k] === v));

  const repo = {
    create: jest.fn((d: any) => ({ ...d })),
    save: jest.fn(async (e: any) => {
      if (!e.id) {
        e.id = ++seq;
        filas.push(e);
      }
      return e;
    }),
    find: jest.fn(async ({ where }: any) => filas.filter((f) => coincide(f, where))),
    findOne: jest.fn(async ({ where, lock }: any) => {
      const f = filas.find((x) => coincide(x, where)) ?? null;
      if (f && lock) log.push(`lock-valoracion:${f.id}`);
      return f;
    }),
    update: jest.fn(async (criterio: any, parcial: any) => {
      const afectadas = filas.filter((f) => coincide(f, criterio));
      afectadas.forEach((f) => Object.assign(f, parcial));
      log.push(`update:${afectadas.map((a) => a.id).join(',')}`);
      return { affected: afectadas.length };
    }),
  };

  const manager: any = {
    getRepository: () => repo,
    createQueryBuilder: () => {
      let id: number;
      let bloquea = false;
      const qb: any = {
        select: () => qb,
        where: (_: string, p: any) => ((id = p.expedienteId), qb),
        setLock: () => ((bloquea = true), qb),
        getOne: async () => {
          if (!expedientes.includes(id)) return null;
          if (bloquea) log.push(`lock-expediente:${id}`);
          return { id_expediente: id };
        },
      };
      return qb;
    },
  };
  const dataSource: any = {
    manager,
    getRepository: () => repo,
    transaction: jest.fn(async (_iso: string, cb: any) => cb(manager)),
  };
  return { svc: new ValoracionesFisioterapeuticasService(dataSource), filas, log, repo, dataSource };
};

const semilla = (db: ReturnType<typeof buildDb>, parcial: any = {}) => {
  const v = { id: db.filas.length + 100, expedienteId: 1, fecha: '2026-10-01', estado: EstadoValoracion.BORRADOR, anulado: false, presentaDolor: false, ...parcial };
  db.filas.push(v);
  return v;
};

describe('ValoracionesFisioterapeuticasService (RN-01/02/03)', () => {
  describe('crear', () => {
    it('RN-01: expediente inexistente → 404 y no se crea nada', async () => {
      const db = buildDb([1]);
      await expect(db.svc.crear(99, {}, 5)).rejects.toBeInstanceOf(NotFoundException);
      expect(db.repo.save).not.toHaveBeenCalled();
    });

    it('nace en BORRADOR, responsable = usuario autenticado, fecha = hoy (Costa Rica) por defecto', async () => {
      const db = buildDb();
      const v = await db.svc.crear(1, { tratamiento: 'Ejercicios' }, 42);
      expect(v).toMatchObject({
        expedienteId: 1,
        estado: EstadoValoracion.BORRADOR,
        usuarioResponsableId: 42,
        creadoPorId: 42,
        fecha: hoyCostaRica(),
        tratamiento: 'Ejercicios',
      });
      expect(v.modificadoPorId).toBeUndefined();
    });

    it('guardado parcial: acepta un borrador casi vacío aunque falten datos', async () => {
      const db = buildDb();
      await expect(db.svc.crear(1, { presentaDolor: true }, 5)).resolves.toMatchObject({ presentaDolor: true });
    });

    it('rechaza fecha futura y fecha inexistente (400)', async () => {
      const db = buildDb();
      await expect(db.svc.crear(1, { fecha: '2999-01-01' }, 5)).rejects.toBeInstanceOf(BadRequestException);
      await expect(db.svc.crear(1, { fecha: '2026-02-30' }, 5)).rejects.toBeInstanceOf(BadRequestException);
      expect(db.repo.save).not.toHaveBeenCalled();
    });

    it('rechaza combinaciones contradictorias (intensidad sin dolor) con 400', async () => {
      const db = buildDb();
      await expect(db.svc.crear(1, { presentaDolor: false, intensidadDolor: 6 }, 5)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('CA-05: la valoración global NO se deduce de las orientaciones (se guarda lo que se envía)', async () => {
      const db = buildDb();
      const v = await db.svc.crear(
        1,
        { orientacionPersona: true, orientacionEspacio: true, orientacionTiempo: false, conscienteOrientado: false, cambiosConductuales: 'Agitación' },
        5,
      );
      expect(v).toMatchObject({ orientacionTiempo: false, conscienteOrientado: false });
    });

    it('CA-06: un tratamiento de >2000 caracteres se conserva íntegro', async () => {
      const db = buildDb();
      const largo = 'Plan terapéutico áéíóú ñ '.repeat(200);
      expect(largo.length).toBeGreaterThan(2000);
      const v = await db.svc.crear(1, { tratamiento: largo, diagnosticoDiferencial: largo }, 5);
      expect(v.tratamiento).toBe(largo);
      expect(v.diagnosticoDiferencial).toBe(largo);
    });
  });

  describe('actualizar (solo borrador)', () => {
    it('edita un borrador, mezcla con lo existente y estampa modificadoPorId', async () => {
      const db = buildDb();
      const b = semilla(db, { postura: 'encorvada', creadoPorId: 1 });
      const v = await db.svc.actualizar(b.id, { rangoMovimiento: 'limitado' }, 9);
      expect(v).toMatchObject({ postura: 'encorvada', rangoMovimiento: 'limitado', modificadoPorId: 9, creadoPorId: 1, estado: 'borrador' });
      expect(db.log).toContain(`lock-valoracion:${b.id}`); // bloquea la fila: no pisa una confirmación en curso
    });

    it.each([EstadoValoracion.VIGENTE, EstadoValoracion.REEMPLAZADA])('una %s NO se edita (409)', async (estado) => {
      const db = buildDb();
      const c = semilla(db, { estado });
      await expect(db.svc.actualizar(c.id, { postura: 'x' }, 9)).rejects.toBeInstanceOf(ConflictException);
      expect(c).not.toHaveProperty('postura');
    });

    it('una anulada no se edita (409)', async () => {
      const db = buildDb();
      const a = semilla(db, { anulado: true });
      await expect(db.svc.actualizar(a.id, { postura: 'x' }, 9)).rejects.toBeInstanceOf(ConflictException);
    });

    it('id inexistente → 404', async () => {
      await expect(buildDb().svc.actualizar(999, {}, 9)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('la coherencia se evalúa sobre el estado FINAL: apagar el dolor con intensidad guardada → 400 y no cambia', async () => {
      const db = buildDb();
      const b = semilla(db, { presentaDolor: true, zonaDolorosa: 'Rodilla', intensidadDolor: 6 });
      await expect(db.svc.actualizar(b.id, { presentaDolor: false }, 9)).rejects.toBeInstanceOf(BadRequestException);
      // Apagarlo limpiando los dependientes en la misma petición sí funciona:
      const ok = await db.svc.actualizar(b.id, { presentaDolor: false, zonaDolorosa: null, intensidadDolor: null }, 9);
      expect(ok).toMatchObject({ presentaDolor: false, zonaDolorosa: null, intensidadDolor: null });
    });

    it('null limpia un campo; la fecha no se puede vaciar', async () => {
      const db = buildDb();
      const b = semilla(db, { postura: 'x', fecha: '2026-10-01' });
      const v = await db.svc.actualizar(b.id, { postura: null, fecha: null as any }, 9);
      expect(v.postura).toBeNull();
      expect(v.fecha).toBe('2026-10-01');
    });

    it('fecha futura en el PATCH → 400', async () => {
      const db = buildDb();
      const b = semilla(db);
      await expect(db.svc.actualizar(b.id, { fecha: '2999-01-01' }, 9)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('confirmar (borrador → vigente) — RN-03', () => {
    it('la confirma y la vigente anterior pasa a reemplazada, en una sola transacción', async () => {
      const db = buildDb();
      const vieja = semilla(db, { estado: EstadoValoracion.VIGENTE });
      const nueva = semilla(db);
      const r = await db.svc.confirmar(nueva.id, 9);
      expect(r).toMatchObject({ id: nueva.id, estado: EstadoValoracion.VIGENTE, modificadoPorId: 9 });
      expect(vieja.estado).toBe(EstadoValoracion.REEMPLAZADA);
      expect(db.dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(db.dataSource.transaction.mock.calls[0][0]).toBe('READ COMMITTED');
    });

    it('INVARIANTE: tras varias confirmaciones sucesivas nunca hay dos vigentes (no anuladas)', async () => {
      const db = buildDb();
      const ids = [semilla(db).id, semilla(db).id, semilla(db).id];
      for (const id of ids) {
        await db.svc.confirmar(id, 9);
        expect(db.filas.filter((f) => f.estado === 'vigente' && !f.anulado)).toHaveLength(1);
      }
      expect(db.filas.map((f) => f.estado)).toEqual(['reemplazada', 'reemplazada', 'vigente']);
    });

    it('toma el candado del EXPEDIENTE antes de re-leer/bloquear la valoración (serializa confirmaciones)', async () => {
      const db = buildDb();
      const b = semilla(db);
      await db.svc.confirmar(b.id, 9);
      const iExp = db.log.indexOf('lock-expediente:1');
      const iVal = db.log.indexOf(`lock-valoracion:${b.id}`);
      const iUpd = db.log.findIndex((e) => e.startsWith('update:'));
      expect(iExp).toBeGreaterThanOrEqual(0);
      expect(iExp).toBeLessThan(iVal);
      expect(iVal).toBeLessThan(iUpd);
    });

    it('solo desplaza a la vigente de SU expediente, no a la de otro', async () => {
      const db = buildDb([1, 2]);
      const otra = semilla(db, { expedienteId: 2, estado: EstadoValoracion.VIGENTE });
      const b = semilla(db, { expedienteId: 1 });
      await db.svc.confirmar(b.id, 9);
      expect(otra.estado).toBe(EstadoValoracion.VIGENTE);
    });

    it('no toca a una vigente ANULADA ni a las reemplazadas (sin cascada, RN-02)', async () => {
      const db = buildDb();
      const anulada = semilla(db, { estado: EstadoValoracion.VIGENTE, anulado: true });
      const reemplazada = semilla(db, { estado: EstadoValoracion.REEMPLAZADA });
      const b = semilla(db);
      await db.svc.confirmar(b.id, 9);
      expect(anulada.estado).toBe(EstadoValoracion.VIGENTE);
      expect(reemplazada.estado).toBe(EstadoValoracion.REEMPLAZADA);
    });

    it('faltan campos obligatorios → 400 con la lista y NO cambia nada (ni la anterior vigente)', async () => {
      const db = buildDb();
      const vieja = semilla(db, { estado: EstadoValoracion.VIGENTE });
      const b = semilla(db, { presentaDolor: true }); // dolor sin zona ni intensidad
      let error: any;
      try {
        await db.svc.confirmar(b.id, 9);
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.getResponse().faltantes).toEqual(['zonaDolorosa', 'intensidadDolor']);
      expect(db.repo.update).not.toHaveBeenCalled();
      expect(b.estado).toBe(EstadoValoracion.BORRADOR);
      expect(vieja.estado).toBe(EstadoValoracion.VIGENTE);
    });

    it('confirmar valida con la dirección de irradiación cuando hay «irradiado»', async () => {
      const db = buildDb();
      const b = semilla(db, { presentaDolor: true, zonaDolorosa: 'x', intensidadDolor: 7, caracteristicasDolor: [CaracteristicaDolor.IRRADIADO] });
      await expect(db.svc.confirmar(b.id, 9)).rejects.toMatchObject({ response: { faltantes: ['direccionIrradiacion'] } });
    });

    it.each([EstadoValoracion.VIGENTE, EstadoValoracion.REEMPLAZADA])('confirmar una %s → 409', async (estado) => {
      const db = buildDb();
      const c = semilla(db, { estado });
      await expect(db.svc.confirmar(c.id, 9)).rejects.toBeInstanceOf(ConflictException);
    });

    it('confirmar una anulada → 409; id inexistente → 404', async () => {
      const db = buildDb();
      const a = semilla(db, { anulado: true });
      await expect(db.svc.confirmar(a.id, 9)).rejects.toBeInstanceOf(ConflictException);
      await expect(db.svc.confirmar(12345, 9)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('anular — RN-02 (nunca se borra)', () => {
    it('marca anulado con motivo, usuario y fecha; la fila sigue existiendo', async () => {
      const db = buildDb();
      const b = semilla(db);
      const r = await db.svc.anular(b.id, 'Cargada en el expediente equivocado', 9);
      expect(r).toMatchObject({ anulado: true, motivoAnulacion: 'Cargada en el expediente equivocado', anuladoPorId: 9, modificadoPorId: 9 });
      expect(r.fechaAnulacion).toBeInstanceOf(Date);
      expect(db.filas).toHaveLength(1);
    });

    it('anular la vigente NO resucita a la anterior ni anula otras (sin cascada)', async () => {
      const db = buildDb();
      const anterior = semilla(db, { estado: EstadoValoracion.REEMPLAZADA });
      const vigente = semilla(db, { estado: EstadoValoracion.VIGENTE });
      await db.svc.anular(vigente.id, 'Error', 9);
      expect(anterior).toMatchObject({ estado: EstadoValoracion.REEMPLAZADA, anulado: false });
      expect(vigente.estado).toBe(EstadoValoracion.VIGENTE); // conserva su estado; deja de contar como vigente
      await expect(db.svc.obtenerVigente(1)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('se puede anular en cualquier estado, pero no dos veces (409)', async () => {
      const db = buildDb();
      const r = semilla(db, { estado: EstadoValoracion.REEMPLAZADA });
      await db.svc.anular(r.id, 'x', 9);
      await expect(db.svc.anular(r.id, 'otra vez', 9)).rejects.toBeInstanceOf(ConflictException);
    });

    it('id inexistente → 404', async () => {
      await expect(buildDb().svc.anular(404, 'x', 9)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('lecturas', () => {
    it('listar: expediente inexistente → 404', async () => {
      await expect(buildDb().svc.listar(77)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('obtenerVigente: devuelve solo la vigente no anulada; 404 si no hay', async () => {
      const db = buildDb();
      semilla(db, { estado: EstadoValoracion.REEMPLAZADA });
      semilla(db);
      await expect(db.svc.obtenerVigente(1)).rejects.toBeInstanceOf(NotFoundException);
      const vig = semilla(db, { estado: EstadoValoracion.VIGENTE });
      await expect(db.svc.obtenerVigente(1)).resolves.toMatchObject({ id: vig.id, estado: 'vigente' });
    });

    it('obtenerVigente: expediente inexistente → 404', async () => {
      await expect(buildDb().svc.obtenerVigente(77)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  it('no existe ninguna operación de borrado físico', () => {
    const metodos = Object.getOwnPropertyNames(ValoracionesFisioterapeuticasService.prototype);
    expect(metodos.filter((m) => /elimin|delete|remove|borrar/i.test(m))).toEqual([]);
  });
});
