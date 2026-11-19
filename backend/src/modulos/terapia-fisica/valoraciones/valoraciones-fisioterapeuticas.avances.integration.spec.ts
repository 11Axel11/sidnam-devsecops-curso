import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { AntecedentePersonal } from 'src/modulos/catalogos/entities/catalogos.entities';
import { ValoracionFisioterapeutica } from '../entities/valoracion-fisioterapeutica.entity';
import { abrirDataSourceDeIntegracion, INTEGRACION_ACTIVA, nuevoExpediente } from './testing/integracion';
import { ValoracionesFisioterapeuticasService } from './valoraciones-fisioterapeuticas.service';

/**
 * INTEGRACIÓN con MySQL REAL (opt-in) de `avances`: columna `text NULL` (admite más de 2000 caracteres sin perder
 * nada), `null`, lectura en vigente/detalle/historial y que NO se exige para confirmar.
 *
 *   RUN_DB_INTEGRATION=1 DB_TEST_NAME=sidnam_scratch_b4 npx jest integration --runInBand
 */
(INTEGRACION_ACTIVA ? describe : describe.skip)('Valoración fisioterapéutica — avances (integración MySQL)', () => {
  jest.setTimeout(180_000);
  let ds: DataSource;
  let svc: ValoracionesFisioterapeuticasService;

  beforeAll(async () => {
    ds = await abrirDataSourceDeIntegracion();
    svc = new ValoracionesFisioterapeuticasService(ds);
    // `confirmar` exige evaluar los antecedentes personales ACTIVOS (BE-2b): esta suite no los prueba.
    await ds.createQueryBuilder().update(AntecedentePersonal).set({ activo: false }).execute();
  });

  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  const leer = (id: number) => ds.getRepository(ValoracionFisioterapeutica).findOneByOrFail({ id });
  const LARGO = 'Avance de la profesional con tildes y eñes: caminó más lejos, menos dolor ñ. '.repeat(120);

  it('texto de más de 2000 caracteres: se guarda y se relee idéntico (columna text, sin fragmentar)', async () => {
    expect(LARGO.length).toBeGreaterThan(8000);
    const exp = await nuevoExpediente(ds);
    const v = await svc.crear(exp, { avances: LARGO }, 1);
    expect((await leer(v.id)).avances).toBe(LARGO);
    const mas = LARGO.repeat(2);
    await svc.actualizar(v.id, { avances: mas }, 1);
    expect((await leer(v.id)).avances).toBe(mas);
  });

  it('sin avances queda NULL; null limpia uno existente; omitirlo no lo toca', async () => {
    const exp = await nuevoExpediente(ds);
    const v = await svc.crear(exp, {}, 1);
    expect((await leer(v.id)).avances).toBeNull();
    await svc.actualizar(v.id, { avances: 'Mejora' }, 1);
    await svc.actualizar(v.id, { tratamiento: 'Fortalecimiento' }, 1);
    expect((await leer(v.id)).avances).toBe('Mejora');
    await svc.actualizar(v.id, { avances: null }, 1);
    expect((await leer(v.id)).avances).toBeNull();
  });

  it('no se exige para confirmar y viaja en vigente, detalle e historial', async () => {
    const exp = await nuevoExpediente(ds);
    const sin = await svc.crear(exp, {}, 1);
    await expect(svc.confirmar(sin.id, 1)).resolves.toMatchObject({ estado: 'vigente' });

    const con = await svc.crear(exp, { avances: 'Camina con andadera sin ayuda' }, 1);
    await svc.confirmar(con.id, 1);
    expect((await svc.obtenerVigente(exp)).avances).toBe('Camina con andadera sin ayuda');
    expect((await svc.obtenerDetalle(con.id)).avances).toBe('Camina con andadera sin ayuda');
    const historial = await svc.listar(exp);
    expect(historial.find((h) => h.id === con.id)?.avances).toBe('Camina con andadera sin ayuda');
    expect(historial.find((h) => h.id === sin.id)?.avances ?? null).toBeNull();
  });

  it('esquema: avances es text NULL', async () => {
    const cols: { COLUMN_TYPE: string; IS_NULLABLE: string }[] = await ds.query(
      "SELECT COLUMN_TYPE, IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'valoracion_fisioterapeutica' AND COLUMN_NAME = 'avances'",
    );
    expect(cols[0]).toEqual({ COLUMN_TYPE: 'text', IS_NULLABLE: 'YES' });
  });
});
