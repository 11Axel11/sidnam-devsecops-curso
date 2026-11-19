/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return -- prueba contra MySQL real */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ConflictException } from '@nestjs/common';
import { EstadoValoracion } from 'src/common/enums/estadoValoracion.enum';
import { AntecedentePersonal } from 'src/modulos/catalogos/entities/catalogos.entities';
import { ValoracionFisioterapeutica } from '../entities/valoracion-fisioterapeutica.entity';
import { CaracteristicaDolor } from '../enums/caracteristicaDolor.enum';
import { ValoracionesFisioterapeuticasService } from './valoraciones-fisioterapeuticas.service';
import { abrirDataSourceDeIntegracion, INTEGRACION_ACTIVA, nuevoExpediente } from './testing/integracion';

/**
 * PRUEBA DE INTEGRACIÓN contra un MySQL REAL (invariante RN-03: nunca dos
 * `vigente` por expediente, ni con confirmaciones casi simultáneas).
 *
 * Es OPT-IN: no corre con `jest` normal (no hace falta una base). Para
 * correrla hay que apuntar a una base DESCARTABLE del MySQL local:
 *
 *   RUN_DB_INTEGRATION=1 DB_TEST_NAME=sidnam_scratch_b12 npx jest valoraciones-fisioterapeuticas.integration
 *
 * Salvaguardas: el host debe ser local y el nombre de la base debe empezar
 * por `sidnam_scratch_`, así que NUNCA puede ejecutarse contra dev ni prod.
 * La base se sincroniza (`synchronize`) con todas las entidades del proyecto.
 */
(INTEGRACION_ACTIVA ? describe : describe.skip)('Valoración fisioterapéutica — integración MySQL (RN-03)', () => {
  jest.setTimeout(180_000);
  let ds: DataSource;
  let svc: ValoracionesFisioterapeuticasService;

  beforeAll(async () => {
    ds = await abrirDataSourceDeIntegracion();
    svc = new ValoracionesFisioterapeuticasService(ds);
    // Esta suite prueba la máquina de estados de la CABECERA. Como `confirmar` exige evaluar todos los
    // antecedentes personales ACTIVOS (BE-2b), se deja el catálogo sin ítems activos; los antecedentes
    // tienen su propia suite (antecedentes-valoracion.integration.spec.ts), que activa el catálogo.
    await ds.createQueryBuilder().update(AntecedentePersonal).set({ activo: false }).execute();
  });

  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  const nuevoExp = (): Promise<number> => nuevoExpediente(ds);
  const borrador = async (expedienteId: number, extra: object = {}) => (await svc.crear(expedienteId, { ...extra }, 1)).id;
  const filas = (expedienteId: number) => ds.getRepository(ValoracionFisioterapeutica).find({ where: { expedienteId }, order: { id: 'ASC' } });
  const vigentes = (fs_: ValoracionFisioterapeutica[]) => fs_.filter((f) => f.estado === EstadoValoracion.VIGENTE && !f.anulado);

  it('INVARIANTE: 10 confirmaciones simultáneas del mismo expediente → exactamente 1 vigente (repetido 5 veces)', async () => {
    for (let ronda = 0; ronda < 5; ronda++) {
      const exp = await nuevoExp();
      const ids: number[] = [];
      for (let i = 0; i < 10; i++) ids.push(await borrador(exp));

      const resultados = await Promise.allSettled(ids.map((id) => svc.confirmar(id, 1)));

      const rechazadas = resultados.filter((r) => r.status === 'rejected');
      expect(rechazadas.map((r: any) => r.reason?.message)).toEqual([]); // ninguna debe fallar (ni deadlock)
      const todas = await filas(exp);
      expect(vigentes(todas)).toHaveLength(1);
      expect(todas.filter((f) => f.estado === EstadoValoracion.REEMPLAZADA)).toHaveLength(9);
      expect(todas.filter((f) => f.estado === EstadoValoracion.BORRADOR)).toHaveLength(0);
    }
  });

  it('confirmaciones simultáneas en expedientes DISTINTOS no se bloquean entre sí: 1 vigente por expediente', async () => {
    const exps = await Promise.all([nuevoExp(), nuevoExp(), nuevoExp()]);
    const ids = await Promise.all(exps.map((e) => borrador(e)));
    await Promise.all(ids.map((id) => svc.confirmar(id, 1)));
    for (const e of exps) expect(vigentes(await filas(e))).toHaveLength(1);
  });

  it('confirmar dos veces la MISMA valoración a la vez: una gana, la otra recibe 409, sigue habiendo 1 vigente', async () => {
    const exp = await nuevoExp();
    const id = await borrador(exp);
    const r = await Promise.allSettled([svc.confirmar(id, 1), svc.confirmar(id, 1)]);
    expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    const fallo = r.find((x) => x.status === 'rejected') as PromiseRejectedResult;
    expect(fallo.reason).toBeInstanceOf(ConflictException);
    expect(vigentes(await filas(exp))).toHaveLength(1);
  });

  it('editar (PATCH) y confirmar a la vez: nunca se modifica una valoración ya cerrada', async () => {
    for (let i = 0; i < 5; i++) {
      const exp = await nuevoExp();
      const id = await borrador(exp);
      const [patch, conf] = await Promise.allSettled([svc.actualizar(id, { postura: 'cambiada' }, 2), svc.confirmar(id, 1)]);
      expect(conf.status).toBe('fulfilled');
      const final = (await filas(exp))[0];
      expect(final.estado).toBe(EstadoValoracion.VIGENTE);
      if (patch.status === 'fulfilled') expect(final.postura).toBe('cambiada'); // el PATCH ocurrió ANTES de cerrarse
      else {
        expect(patch.reason).toBeInstanceOf(ConflictException); // llegó tarde
        expect(final.postura).toBeNull();
      }
    }
  });

  it('faltantes → 400 y rollback real: la vigente anterior sigue vigente y el borrador sigue borrador', async () => {
    const exp = await nuevoExp();
    const vieja = await borrador(exp);
    await svc.confirmar(vieja, 1);
    const incompleto = await borrador(exp, { presentaDolor: true });
    await expect(svc.confirmar(incompleto, 1)).rejects.toMatchObject({ response: { faltantes: ['zonaDolorosa', 'intensidadDolor'] } });
    const todas = await filas(exp);
    expect(todas.find((f) => f.id === vieja)?.estado).toBe(EstadoValoracion.VIGENTE);
    expect(todas.find((f) => f.id === incompleto)?.estado).toBe(EstadoValoracion.BORRADOR);
  });

  it('anular conserva la fila (RN-02) y deja al expediente sin vigente; luego otra confirmación funciona', async () => {
    const exp = await nuevoExp();
    const a = await borrador(exp);
    await svc.confirmar(a, 1);
    await svc.anular(a, 'Cargada por error', 3);
    const anulada = (await filas(exp))[0];
    expect(anulada).toMatchObject({ anulado: true, motivoAnulacion: 'Cargada por error', anuladoPorId: 3 });
    expect(anulada.fechaAnulacion).toBeInstanceOf(Date);
    expect(vigentes(await filas(exp))).toHaveLength(0);

    const b = await borrador(exp);
    await svc.confirmar(b, 1);
    const todas = await filas(exp);
    expect(vigentes(todas)).toHaveLength(1);
    expect(todas.find((f) => f.id === a)?.estado).toBe(EstadoValoracion.VIGENTE); // la anulada no se toca
  });

  it('CA-06: textos de >2000 y de 20000 caracteres con tildes se guardan y se leen SIN pérdida ni fragmentación', async () => {
    const exp = await nuevoExp();
    const t2k = 'Ejercicio terapéutico, rotación y flexión ñ áéíóú. '.repeat(60); // ~3000
    const t20k = 'ñá'.repeat(10000);
    expect(t2k.length).toBeGreaterThan(2000);
    const id = await borrador(exp, { tratamiento: t2k.trim(), diagnosticoDiferencial: t20k, cambiosConductuales: t2k.trim() });
    const leida = await ds.getRepository(ValoracionFisioterapeutica).findOneByOrFail({ id });
    expect(leida.tratamiento).toBe(t2k.trim());
    expect(leida.diagnosticoDiferencial).toBe(t20k);
    expect(leida.diagnosticoDiferencial).toHaveLength(20000);
    // una sola fila, sin segmentos
    expect(await filas(exp)).toHaveLength(1);
  });

  it('CA-04: características del dolor múltiples se conservan (ida y vuelta) y null/vacío se leen como null/[]', async () => {
    const exp = await nuevoExp();
    const id = await borrador(exp, {
      presentaDolor: true,
      zonaDolorosa: 'Miembro inferior derecho',
      caracteristicasDolor: [CaracteristicaDolor.PUNZANTE, CaracteristicaDolor.IRRADIADO],
      direccionIrradiacion: 'Hacia el miembro inferior derecho',
      intensidadDolor: 7,
    });
    const v = await ds.getRepository(ValoracionFisioterapeutica).findOneByOrFail({ id });
    expect(v.caracteristicasDolor).toEqual(['punzante', 'irradiado']);
    expect(v.intensidadDolor).toBe(7);
    await svc.confirmar(id, 1); // completa: ya tiene zona, intensidad y dirección
    const sin = await borrador(exp);
    expect((await ds.getRepository(ValoracionFisioterapeutica).findOneByOrFail({ id: sin })).caracteristicasDolor).toBeNull();
  });

  it('RN-01: expediente inexistente → 404 (no se crea nada) y la FK está activa en la base', async () => {
    await expect(svc.crear(99999999, {}, 1)).rejects.toMatchObject({ status: 404 });
    await expect(
      ds.getRepository(ValoracionFisioterapeutica).insert({ expedienteId: 99999999, fecha: '2026-10-01', usuarioResponsableId: 1 } as any),
    ).rejects.toThrow(/foreign key/i);
  });

  it('auditoría y trazabilidad: creadoPorId/modificadoPorId, responsable fijado por el servidor', async () => {
    const exp = await nuevoExp();
    const id = await borrador(exp);
    await svc.actualizar(id, { postura: 'x' }, 8);
    const v = await ds.getRepository(ValoracionFisioterapeutica).findOneByOrFail({ id });
    expect(v).toMatchObject({ creadoPorId: 1, usuarioResponsableId: 1, modificadoPorId: 8 });
  });

  it('historial: listar devuelve todo (vigente, reemplazadas, anuladas, borradores) y vigente solo la vigente', async () => {
    const exp = await nuevoExp();
    const [a, b, c] = [await borrador(exp), await borrador(exp), await borrador(exp)];
    await svc.confirmar(a, 1);
    await svc.confirmar(b, 1);
    await svc.anular(c, 'x', 1);
    const historial = await svc.listar(exp);
    expect(historial).toHaveLength(3);
    expect((await svc.obtenerVigente(exp)).id).toBe(b);
  });
});
