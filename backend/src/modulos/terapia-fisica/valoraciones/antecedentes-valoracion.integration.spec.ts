/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return -- prueba contra MySQL real */
import 'reflect-metadata';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EstadoValoracion } from 'src/common/enums/estadoValoracion.enum';
import { AntecedentePersonal, TipoAntecedenteTraumatico } from 'src/modulos/catalogos/entities/catalogos.entities';
import { ANTECEDENTES_PERSONALES, TIPOS_ANTECEDENTE_TRAUMATICO } from 'src/modulos/catalogos/seed/catalogos-iniciales';
import { AntecedenteTraumatico } from '../entities/antecedente-traumatico.entity';
import { ValoracionFisioterapeutica } from '../entities/valoracion-fisioterapeutica.entity';
import { ValoracionTfAntecedentePersonal } from '../entities/valoracion-tf-antecedente-personal.entity';
import { AntecedentesValoracionService } from './antecedentes-valoracion.service';
import { abrirDataSourceDeIntegracion, INTEGRACION_ACTIVA, nuevoExpediente } from './testing/integracion';
import { ValoracionesFisioterapeuticasService } from './valoraciones-fisioterapeuticas.service';

/**
 * INTEGRACIÓN con MySQL REAL (opt-in; ver testing/integracion.ts) de los
 * antecedentes de la valoración fisioterapéutica: concurrencia de un hijo
 * contra `confirmar`, unicidad del upsert, FK, textos largos y catálogo.
 *
 * Técnica de BE-2a: se lanzan las dos operaciones a la vez muchas veces y se
 * verifican invariantes que valen para CUALQUIER orden de llegada:
 *  - si la escritura del hijo se reportó exitosa, el hijo está en la base; si
 *    recibió 409, NO está (nunca un «éxito» perdido ni un hijo fantasma);
 *  - ningún hijo se escribe DESPUÉS de cerrada la valoración: su marca de
 *    tiempo (datetime(6)) es ≤ la de la confirmación.
 */
(INTEGRACION_ACTIVA ? describe : describe.skip)('Antecedentes de la valoración — integración MySQL', () => {
  jest.setTimeout(240_000);
  let ds: DataSource;
  let valoraciones: ValoracionesFisioterapeuticasService;
  let hijos: AntecedentesValoracionService;
  let antecedentes: AntecedentePersonal[]; // catálogo activo (17)
  let tipoFractura: TipoAntecedenteTraumatico;
  let tipoOtro: TipoAntecedenteTraumatico;

  beforeAll(async () => {
    ds = await abrirDataSourceDeIntegracion();
    valoraciones = new ValoracionesFisioterapeuticasService(ds);
    hijos = new AntecedentesValoracionService(ds);
    // Catálogos iniciales (en la app los siembra CatalogosSeedService al arrancar).
    const rA = ds.getRepository(AntecedentePersonal);
    if ((await rA.count()) === 0) await rA.save(ANTECEDENTES_PERSONALES.map((nombre) => rA.create({ nombre, activo: true })));
    const rT = ds.getRepository(TipoAntecedenteTraumatico);
    if ((await rT.count()) === 0) await rT.save(TIPOS_ANTECEDENTE_TRAUMATICO.map((nombre) => rT.create({ nombre, activo: true })));
    // Precondición: todos los ítems activos (otra suite pudo dejarlos desactivados).
    await ds.createQueryBuilder().update(AntecedentePersonal).set({ activo: true }).execute();
    await ds.createQueryBuilder().update(TipoAntecedenteTraumatico).set({ activo: true }).execute();
    antecedentes = await rA.find({ where: { activo: true }, order: { id: 'ASC' } });
    tipoFractura = await rT.findOneByOrFail({ nombre: 'Fractura' });
    tipoOtro = await rT.findOneByOrFail({ nombre: 'Otro' });
  });

  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  /** TypeORM escribe `fechaModificacion` con precisión de segundo: las comparaciones se hacen en segundos. */
  const seg = (d: Date): number => Math.floor(d.getTime() / 1000);
  const item = (antecedenteId: number, presente: boolean, observacion: string | null = null) => ({ antecedenteId, presente, observacion });
  const todosDescartados = () => antecedentes.map((a) => item(a.id, false));
  const nuevaValoracion = async (): Promise<number> => {
    const exp = await nuevoExpediente(ds);
    return (await valoraciones.crear(exp, {}, 1)).id;
  };
  /** Valoración borrador con TODOS los antecedentes activos ya evaluados por el usuario 5. */
  const valoracionCompleta = async (): Promise<number> => {
    const id = await nuevaValoracion();
    await hijos.registrarPersonales(id, { antecedentes: todosDescartados() }, 5);
    return id;
  };
  const valoracion = (id: number) => ds.getRepository(ValoracionFisioterapeutica).findOneByOrFail({ id });
  const filasPersonales = (id: number) => ds.getRepository(ValoracionTfAntecedentePersonal).find({ where: { valoracionId: id }, order: { antecedenteId: 'ASC' } });
  const filasTraumaticas = (id: number) => ds.getRepository(AntecedenteTraumatico).find({ where: { valoracionId: id }, order: { id: 'ASC' } });

  it('el catálogo de prueba tiene los 17 ítems activos y los 5 tipos', () => {
    expect(antecedentes).toHaveLength(17);
    expect(tipoFractura.id).toBeDefined();
    expect(tipoOtro.id).toBeDefined();
  });

  describe('personales', () => {
    it('upsert de los 17 ítems en una sola llamada; reenviar lo mismo es idempotente (sin duplicados ni cambios)', async () => {
      const id = await nuevaValoracion();
      const cuerpo = { antecedentes: antecedentes.map((a, i) => item(a.id, i < 2, i === 0 ? 'Desde 2019' : null)) };
      const r1 = await hijos.registrarPersonales(id, cuerpo, 5);
      expect(r1).toHaveLength(17);
      const r2 = await hijos.registrarPersonales(id, cuerpo, 9);
      expect(r2.map((x) => x.id)).toEqual(r1.map((x) => x.id));
      const filas = await filasPersonales(id);
      expect(filas).toHaveLength(17);
      expect(filas.every((f) => f.modificadoPorId === null && f.creadoPorId === 5)).toBe(true);
      expect(filas.filter((f) => f.presente)).toHaveLength(2);
      expect(r1[0]).toMatchObject({ nombre: antecedentes[0].nombre, presente: true, observacion: 'Desde 2019' });
    });

    it('cambiar un ítem actualiza la misma fila y audita solo esa', async () => {
      const id = await valoracionCompleta();
      await hijos.registrarPersonales(id, { antecedentes: [item(antecedentes[3].id, true, 'Nuevo')] }, 9);
      const filas = await filasPersonales(id);
      expect(filas).toHaveLength(17);
      expect(filas.filter((f) => f.modificadoPorId === 9)).toHaveLength(1);
      expect(filas.find((f) => f.antecedenteId === antecedentes[3].id)).toMatchObject({ presente: true, observacion: 'Nuevo' });
    });

    it('UNIQUE (valoración, antecedente) en la base: un INSERT duplicado directo falla', async () => {
      const id = await valoracionCompleta();
      await expect(
        ds.getRepository(ValoracionTfAntecedentePersonal).insert({ valoracionId: id, antecedenteId: antecedentes[0].id, presente: true } as any),
      ).rejects.toThrow(/duplicate/i);
    });

    it('6 upserts paralelos del MISMO ítem: todos terminan bien y queda UNA sola fila', async () => {
      const id = await nuevaValoracion();
      const r = await Promise.allSettled(
        Array.from({ length: 6 }, (_, i) => hijos.registrarPersonales(id, { antecedentes: [item(antecedentes[0].id, i % 2 === 0, `v${i}`)] }, 5)),
      );
      expect(r.filter((x) => x.status === 'rejected').map((x: any) => x.reason?.message)).toEqual([]);
      expect(await filasPersonales(id)).toHaveLength(1);
    });

    it('ítem inexistente o inactivo → 400 y NO se guarda ninguno; uno desactivado después sigue resolviéndose', async () => {
      const id = await nuevaValoracion();
      const inactivo = antecedentes[16];
      await ds.getRepository(AntecedentePersonal).update(inactivo.id, { activo: false });
      try {
        await expect(
          hijos.registrarPersonales(id, { antecedentes: [item(antecedentes[0].id, true), item(inactivo.id, true), item(999999, false)] }, 5),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(await filasPersonales(id)).toHaveLength(0); // todo o nada

        // Se evalúa mientras estaba activo, se desactiva después: la lectura lo sigue mostrando.
        await ds.getRepository(AntecedentePersonal).update(inactivo.id, { activo: true });
        await hijos.registrarPersonales(id, { antecedentes: [item(inactivo.id, true, 'x')] }, 5);
        await ds.getRepository(AntecedentePersonal).update(inactivo.id, { activo: false });
        const d = await valoraciones.obtenerDetalle(id);
        expect(d.antecedentesPersonales[0]).toMatchObject({ antecedenteId: inactivo.id, nombre: inactivo.nombre, activo: false, presente: true });
        await expect(hijos.registrarPersonales(id, { antecedentes: [item(inactivo.id, false)] }, 5)).rejects.toBeInstanceOf(BadRequestException);
      } finally {
        await ds.getRepository(AntecedentePersonal).update(inactivo.id, { activo: true }); // restaurar el catálogo compartido
      }
    });

    it('con la valoración vigente → 409 y la fila no cambia', async () => {
      const id = await valoracionCompleta();
      await valoraciones.confirmar(id, 5);
      await expect(hijos.registrarPersonales(id, { antecedentes: [item(antecedentes[0].id, true)] }, 9)).rejects.toBeInstanceOf(ConflictException);
      expect((await filasPersonales(id))[0].presente).toBe(false);
    });
  });

  describe('confirmar exige evaluar todos los ítems activos (BE-2b)', () => {
    it('sin evaluar: 400 con los 17 pendientes; tras evaluarlos, confirma', async () => {
      const id = await nuevaValoracion();
      let error: any;
      try {
        await valoraciones.confirmar(id, 5);
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.getResponse().faltantes).toHaveLength(17);
      expect(error.getResponse().antecedentesPersonalesPendientes[0]).toEqual({ id: antecedentes[0].id, nombre: antecedentes[0].nombre });
      expect((await valoracion(id)).estado).toBe(EstadoValoracion.BORRADOR);

      await hijos.registrarPersonales(id, { antecedentes: todosDescartados() }, 5);
      await expect(valoraciones.confirmar(id, 5)).resolves.toMatchObject({ estado: EstadoValoracion.VIGENTE });
    });

    it('un ítem desactivado antes de evaluarse deja de exigirse', async () => {
      const id = await nuevaValoracion();
      const ultimo = antecedentes[16];
      await hijos.registrarPersonales(id, { antecedentes: antecedentes.slice(0, 16).map((a) => item(a.id, false)) }, 5);
      await ds.getRepository(AntecedentePersonal).update(ultimo.id, { activo: false });
      try {
        await expect(valoraciones.confirmar(id, 5)).resolves.toMatchObject({ estado: EstadoValoracion.VIGENTE });
      } finally {
        await ds.getRepository(AntecedentePersonal).update(ultimo.id, { activo: true });
      }
    });
  });

  describe('traumáticos', () => {
    it('CA-03: dos fracturas y una cirugía = 3 registros independientes; descripción de >2000 caracteres íntegra', async () => {
      const id = await nuevaValoracion();
      const larga = 'Fractura conminuta con osteosíntesis, rotación y flexión ñ áéíóú. '.repeat(60);
      expect(larga.length).toBeGreaterThan(2000);
      const tipoCirugia = await ds.getRepository(TipoAntecedenteTraumatico).findOneByOrFail({ nombre: 'Cirugía' });
      await hijos.crearTraumatico(id, { tipoId: tipoFractura.id, descripcion: larga.trim(), localizacionAnatomica: 'Cadera derecha', tiempoTranscurrido: '3 años' }, 5);
      await hijos.crearTraumatico(id, { tipoId: tipoFractura.id, localizacionAnatomica: 'Muñeca izquierda', tiempoTranscurrido: '10 años' }, 5);
      await hijos.crearTraumatico(id, { tipoId: tipoCirugia.id, descripcion: 'Cirugía de columna' }, 5);
      const filas = await filasTraumaticas(id);
      expect(filas).toHaveLength(3);
      expect(filas[0].descripcion).toBe(larga.trim());
      const d = await valoraciones.obtenerDetalle(id);
      expect(d.antecedentesTraumaticos.map((t) => t.tipo.nombre)).toEqual(['Fractura', 'Fractura', 'Cirugía']);
      expect(d.antecedentesTraumaticos[0].descripcion).toBe(larga.trim());
    });

    it('«Otro» sin descripción → 400 (y nada se crea); con descripción → ok', async () => {
      const id = await nuevaValoracion();
      await expect(hijos.crearTraumatico(id, { tipoId: tipoOtro.id }, 5)).rejects.toBeInstanceOf(BadRequestException);
      expect(await filasTraumaticas(id)).toHaveLength(0);
      await expect(hijos.crearTraumatico(id, { tipoId: tipoOtro.id, descripcion: 'Atropello' }, 5)).resolves.toMatchObject({ tipo: { nombre: 'Otro' } });
    });

    it('corregir y anular conservan la fila (nunca DELETE); el detalle no muestra los anulados', async () => {
      const id = await nuevaValoracion();
      const a = await hijos.crearTraumatico(id, { tipoId: tipoFractura.id, localizacionAnatomica: 'Cadera' }, 5);
      const b = await hijos.crearTraumatico(id, { tipoId: tipoFractura.id, localizacionAnatomica: 'Muñeca' }, 5);
      await hijos.actualizarTraumatico(a.id, { localizacionAnatomica: 'Cadera derecha' }, 9);
      const anulado = await hijos.anularTraumatico(b.id, 'Registrado por error', 9);
      expect(anulado).toMatchObject({ anulado: true, motivoAnulacion: 'Registrado por error', anuladoPorId: 9 });
      expect(await filasTraumaticas(id)).toHaveLength(2); // la anulada sigue existiendo
      const d = await valoraciones.obtenerDetalle(id);
      expect(d.antecedentesTraumaticos.map((t) => t.id)).toEqual([a.id]);
      expect(d.antecedentesTraumaticos[0]).toMatchObject({ localizacionAnatomica: 'Cadera derecha', modificadoPorId: 9 });
      await expect(hijos.anularTraumatico(b.id, 'otra vez', 9)).rejects.toBeInstanceOf(ConflictException);
      await expect(hijos.actualizarTraumatico(b.id, { localizacionAnatomica: 'x' }, 9)).rejects.toBeInstanceOf(ConflictException);
    });

    it('con la valoración vigente: crear, corregir y anular → 409', async () => {
      const id = await valoracionCompleta();
      const t = await hijos.crearTraumatico(id, { tipoId: tipoFractura.id }, 5);
      await valoraciones.confirmar(id, 5);
      await expect(hijos.crearTraumatico(id, { tipoId: tipoFractura.id }, 5)).rejects.toBeInstanceOf(ConflictException);
      await expect(hijos.actualizarTraumatico(t.id, { descripcion: 'x' }, 5)).rejects.toBeInstanceOf(ConflictException);
      await expect(hijos.anularTraumatico(t.id, 'x', 5)).rejects.toBeInstanceOf(ConflictException);
      expect(await filasTraumaticas(id)).toHaveLength(1);
      expect((await filasTraumaticas(id))[0].anulado).toBe(false);
    });

    it('FK activas: un hijo con valoración o catálogo inexistente falla en la base', async () => {
      const id = await nuevaValoracion();
      const repo = ds.getRepository(AntecedenteTraumatico);
      await expect(repo.insert({ valoracionId: 99999999, tipoId: tipoFractura.id } as any)).rejects.toThrow(/foreign key/i);
      await expect(repo.insert({ valoracionId: id, tipoId: 99999999 } as any)).rejects.toThrow(/foreign key/i);
      await expect(
        ds.getRepository(ValoracionTfAntecedentePersonal).insert({ valoracionId: id, antecedenteId: 99999999, presente: true } as any),
      ).rejects.toThrow(/foreign key/i);
    });
  });

  describe('CONCURRENCIA de un hijo contra confirmar (mismo mecanismo de BE-2a)', () => {
    const RONDAS = 10;

    it('(a) cambiar un antecedente ya evaluado ‖ confirmar: nunca se modifica un hijo de una valoración cerrada', async () => {
      let ganoElCambio = 0;
      let ganoLaConfirmacion = 0;
      for (let i = 0; i < RONDAS; i++) {
        const id = await valoracionCompleta();
        const objetivo = antecedentes[i % antecedentes.length].id;
        const [cambio, conf] = await Promise.allSettled([
          hijos.registrarPersonales(id, { antecedentes: [item(objetivo, true, 'cambiado')] }, 7),
          valoraciones.confirmar(id, 5),
        ]);
        expect(conf.status).toBe('fulfilled'); // estaba completa: la confirmación siempre procede
        const v = await valoracion(id);
        expect(v.estado).toBe(EstadoValoracion.VIGENTE);
        const fila = (await filasPersonales(id)).find((f) => f.antecedenteId === objetivo)!;
        if (cambio.status === 'fulfilled') {
          ganoElCambio++;
          expect(fila).toMatchObject({ presente: true, observacion: 'cambiado', modificadoPorId: 7 });
          // el cambio ocurrió ANTES de cerrarse: su marca de tiempo no supera la de la confirmación
          expect(seg(fila.fechaModificacion!)).toBeLessThanOrEqual(seg(v.fechaModificacion!));
        } else {
          ganoLaConfirmacion++;
          expect(cambio.reason).toBeInstanceOf(ConflictException);
          expect(fila).toMatchObject({ presente: false, observacion: null });
          expect(fila.modificadoPorId).toBeNull();
        }
      }
      expect(ganoElCambio + ganoLaConfirmacion).toBe(RONDAS);
    });

    it('(a2) evaluar el ÚLTIMO ítem pendiente ‖ confirmar: si confirma es porque el ítem ya estaba; si no, 400 y la valoración sigue borrador', async () => {
      for (let i = 0; i < RONDAS; i++) {
        const id = await nuevaValoracion();
        const ultimo = antecedentes[16].id;
        await hijos.registrarPersonales(id, { antecedentes: antecedentes.slice(0, 16).map((a) => item(a.id, false)) }, 5);
        const [escritura, conf] = await Promise.allSettled([
          hijos.registrarPersonales(id, { antecedentes: [item(ultimo, true)] }, 7),
          valoraciones.confirmar(id, 5),
        ]);
        expect(escritura.status).toBe('fulfilled'); // el ítem faltante siempre se puede escribir mientras sea borrador…
        const filas = await filasPersonales(id);
        expect(filas).toHaveLength(17);
        const v = await valoracion(id);
        if (conf.status === 'fulfilled') {
          // …y si la confirmación ganó, fue DESPUÉS de que el ítem existiera
          expect(v.estado).toBe(EstadoValoracion.VIGENTE);
          expect(seg(filas[16].fechaCreacion)).toBeLessThanOrEqual(seg(v.fechaModificacion!));
        } else {
          expect(conf.reason).toBeInstanceOf(BadRequestException);
          expect(v.estado).toBe(EstadoValoracion.BORRADOR);
        }
      }
    });

    it('(b) agregar un traumático ‖ confirmar: éxito ⇒ la fila existe y es anterior al cierre; 409 ⇒ no existe', async () => {
      let creados = 0;
      let rechazados = 0;
      for (let i = 0; i < RONDAS; i++) {
        const id = await valoracionCompleta();
        const [alta, conf] = await Promise.allSettled([
          hijos.crearTraumatico(id, { tipoId: tipoFractura.id, descripcion: `r${i}` }, 7),
          valoraciones.confirmar(id, 5),
        ]);
        expect(conf.status).toBe('fulfilled');
        const v = await valoracion(id);
        const filas = await filasTraumaticas(id);
        if (alta.status === 'fulfilled') {
          creados++;
          expect(filas).toHaveLength(1);
          expect(seg(filas[0].fechaCreacion)).toBeLessThanOrEqual(seg(v.fechaModificacion!));
        } else {
          rechazados++;
          expect(alta.reason).toBeInstanceOf(ConflictException);
          expect(filas).toHaveLength(0); // ningún hijo fantasma
        }
      }
      expect(creados + rechazados).toBe(RONDAS);
    });

    it('(c) anular un traumático ‖ confirmar: éxito ⇒ quedó anulado antes del cierre; 409 ⇒ sigue sin anular', async () => {
      for (let i = 0; i < RONDAS; i++) {
        const id = await valoracionCompleta();
        const t = await hijos.crearTraumatico(id, { tipoId: tipoFractura.id }, 5);
        const [anul, conf] = await Promise.allSettled([hijos.anularTraumatico(t.id, 'Error', 7), valoraciones.confirmar(id, 5)]);
        expect(conf.status).toBe('fulfilled');
        const v = await valoracion(id);
        const fila = (await filasTraumaticas(id))[0];
        if (anul.status === 'fulfilled') {
          expect(fila.anulado).toBe(true);
          // fechaAnulacion es `datetime` sin fracción: MySQL redondea al segundo, de ahí el +1.
          expect(seg(fila.fechaAnulacion!)).toBeLessThanOrEqual(seg(v.fechaModificacion!) + 1);
        } else {
          expect(anul.reason).toBeInstanceOf(ConflictException);
          expect(fila.anulado).toBe(false);
        }
      }
    });

    it('(d) 8 escrituras de hijos simultáneas sobre una valoración borrador: todas bien, sin deadlocks ni duplicados', async () => {
      const id = await nuevaValoracion();
      const trabajos = [
        ...Array.from({ length: 4 }, (_, i) => hijos.registrarPersonales(id, { antecedentes: [item(antecedentes[i].id, true)] }, 5)),
        ...Array.from({ length: 4 }, (_, i) => hijos.crearTraumatico(id, { tipoId: tipoFractura.id, localizacionAnatomica: `z${i}` }, 5)),
      ];
      const r = await Promise.allSettled(trabajos);
      expect(r.filter((x) => x.status === 'rejected').map((x: any) => x.reason?.message)).toEqual([]);
      expect(await filasPersonales(id)).toHaveLength(4);
      expect(await filasTraumaticas(id)).toHaveLength(4);
    });
  });

  describe('EXCLUSIÓN MUTUA determinista: se sostiene el candado en otra transacción y se observa a quién bloquea', () => {
    const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    /** ¿Sigue pendiente la promesa pasado un rato? (si el servicio no bloqueara, ya habría terminado) */
    const sigueEsperando = async (p: Promise<unknown>, ms = 600): Promise<boolean> =>
      (await Promise.race([p.then(() => 'termino', () => 'termino'), esperar(ms).then(() => 'espera')])) === 'espera';

    /** Simula una CONFIRMACIÓN en curso: transacción que tiene la fila de la valoración bloqueada. */
    const abrirCandado = async (id: number) => {
      const qr = ds.createQueryRunner();
      await qr.connect();
      await qr.startTransaction('READ COMMITTED');
      await qr.manager.getRepository(ValoracionFisioterapeutica).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      return qr;
    };

    it.each([
      ['registrar personales', (id: number) => hijos.registrarPersonales(id, { antecedentes: [item(antecedentes[0].id, true)] }, 7), async (id: number) => (await filasPersonales(id)).length],
      ['crear traumático', (id: number) => hijos.crearTraumatico(id, { tipoId: tipoFractura.id }, 7), async (id: number) => (await filasTraumaticas(id)).length],
    ])('una escritura de hijo (%s) llega MIENTRAS se confirma: espera el candado, ve la valoración ya vigente y recibe 409', async (_n, escribir, contar) => {
      const id = await nuevaValoracion();
      const qr = await abrirCandado(id);
      const escritura = escribir(id);
      escritura.catch(() => undefined); // evita «unhandled» mientras se espera
      expect(await sigueEsperando(escritura)).toBe(true); // BLOQUEADA por el candado de la valoración
      await qr.manager.getRepository(ValoracionFisioterapeutica).update(id, { estado: EstadoValoracion.VIGENTE });
      await qr.commitTransaction();
      await qr.release();
      await expect(escritura).rejects.toBeInstanceOf(ConflictException);
      expect(await contar(id)).toBe(0); // no quedó ningún hijo sobre la valoración cerrada
    });

    it('anular un traumático llega MIENTRAS se confirma: espera, ve la valoración vigente y recibe 409 (queda sin anular)', async () => {
      const id = await nuevaValoracion();
      const t = await hijos.crearTraumatico(id, { tipoId: tipoFractura.id }, 5);
      const qr = await abrirCandado(id);
      const anulacion = hijos.anularTraumatico(t.id, 'Error', 7);
      anulacion.catch(() => undefined);
      expect(await sigueEsperando(anulacion)).toBe(true);
      await qr.manager.getRepository(ValoracionFisioterapeutica).update(id, { estado: EstadoValoracion.VIGENTE });
      await qr.commitTransaction();
      await qr.release();
      await expect(anulacion).rejects.toBeInstanceOf(ConflictException);
      expect((await filasTraumaticas(id))[0].anulado).toBe(false);
    });

    it('una confirmación llega MIENTRAS se escribe el último antecedente: espera y, al terminar la escritura, YA lo ve y confirma', async () => {
      const id = await nuevaValoracion();
      await hijos.registrarPersonales(id, { antecedentes: antecedentes.slice(0, 16).map((a) => item(a.id, false)) }, 5);
      const qr = await abrirCandado(id); // «escritura de hijo en curso»: tiene la valoración bloqueada
      const confirmacion = valoraciones.confirmar(id, 5);
      confirmacion.catch(() => undefined);
      expect(await sigueEsperando(confirmacion)).toBe(true); // sin candado, habría respondido 400 (falta el ítem 17) al instante
      await qr.manager.getRepository(ValoracionTfAntecedentePersonal).insert({ valoracionId: id, antecedenteId: antecedentes[16].id, presente: true } as any);
      await qr.commitTransaction();
      await qr.release();
      await expect(confirmacion).resolves.toMatchObject({ estado: EstadoValoracion.VIGENTE });
      expect(await filasPersonales(id)).toHaveLength(17);
    });
  });

  describe('lectura', () => {
    it('GET vigente incluye los hijos; el historial solo cabeceras', async () => {
      const id = await valoracionCompleta();
      await hijos.crearTraumatico(id, { tipoId: tipoFractura.id, descripcion: 'Cadera' }, 5);
      const v = await valoraciones.confirmar(id, 5);
      const vigente = await valoraciones.obtenerVigente(v.expedienteId);
      expect(vigente.antecedentesPersonales).toHaveLength(17);
      expect(vigente.antecedentesTraumaticos).toHaveLength(1);
      const historial = await valoraciones.listar(v.expedienteId);
      expect(historial[0]).not.toHaveProperty('antecedentesPersonales');
    });
  });
});
