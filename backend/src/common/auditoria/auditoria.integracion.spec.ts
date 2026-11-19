/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-require-imports -- prueba contra MySQL real */
import 'reflect-metadata';
import { Column, DataSource, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Auditable } from './auditable.entity';

/**
 * INTEGRACIÓN con MySQL REAL (opt-in) de las marcas de tiempo de Auditable.
 *
 *   RUN_DB_INTEGRATION=1 DB_TEST_NAME=sidnam_scratch_tz npx jest auditoria.integracion
 *
 * Cubre el defecto de zona horaria: con `timezone: '-06:00'` en el driver y un
 * MySQL en UTC, las marcas generadas por MySQL (DEFAULT CURRENT_TIMESTAMP)
 * salían 6 horas adelantadas. Auditable las estampa ahora desde Node. Aquí se
 * usa el MISMO `timezone` de app.module.ts y una entidad mínima propia, en una
 * base `sidnam_scratch_*` (nunca dev ni producción).
 */
@Entity('tz_prueba_auditable')
class TzPruebaAuditable extends Auditable {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  nombre: string;
}

const ACTIVA = process.env.RUN_DB_INTEGRATION === '1';
const HORA = 3_600_000;

(ACTIVA ? describe : describe.skip)('Auditable — marcas de tiempo contra MySQL real', () => {
  jest.setTimeout(60_000);
  let ds: DataSource;

  beforeAll(async () => {
    require('dotenv').config();
    const base = process.env.DB_TEST_NAME ?? '';
    if (!base.startsWith('sidnam_scratch_')) throw new Error('DB_TEST_NAME debe empezar por sidnam_scratch_');
    if (!['localhost', '127.0.0.1', '::1'].includes(process.env.DB_HOST as string)) throw new Error('DB_HOST no es local');
    ds = new DataSource({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: base,
      entities: [TzPruebaAuditable],
      synchronize: true,
      timezone: '-06:00', // idéntico a src/app.module.ts
    });
    await ds.initialize();
  });

  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  it('al crear, fechaCreacion y fechaModificacion coinciden con el reloj real (no 6 h adelantadas)', async () => {
    const repo = ds.getRepository(TzPruebaAuditable);
    const antes = Date.now();
    const creada = await repo.save(repo.create({ nombre: 'crear' }));
    const despues = Date.now();

    const releida = await repo.findOneByOrFail({ id: creada.id });
    for (const marca of [releida.fechaCreacion, releida.fechaModificacion as Date]) {
      expect(marca.getTime()).toBeGreaterThanOrEqual(antes - 1000);
      expect(marca.getTime()).toBeLessThanOrEqual(despues + 1000);
      expect(Math.abs(marca.getTime() - Date.now())).toBeLessThan(HORA);
    }
  });

  it('al editar, fechaModificacion avanza con el reloj real y fechaCreacion no cambia', async () => {
    const repo = ds.getRepository(TzPruebaAuditable);
    const creada = await repo.save(repo.create({ nombre: 'editar' }));
    const original = await repo.findOneByOrFail({ id: creada.id });
    await new Promise((r) => setTimeout(r, 30));

    const antes = Date.now();
    original.nombre = 'editado';
    await repo.save(original);
    const despues = Date.now();

    const releida = await repo.findOneByOrFail({ id: creada.id });
    const mod = (releida.fechaModificacion as Date).getTime();
    expect(mod).toBeGreaterThanOrEqual(antes - 1000);
    expect(mod).toBeLessThanOrEqual(despues + 1000);
    expect(mod).toBeGreaterThan(original.fechaCreacion.getTime());
    expect(releida.fechaCreacion.getTime()).toBe(original.fechaCreacion.getTime());
  });

  it('la marca de modificación conserva milisegundos (antes TypeORM la dejaba en precisión de segundo)', async () => {
    const repo = ds.getRepository(TzPruebaAuditable);
    const muestras: number[] = [];
    for (let i = 0; i < 5; i++) {
      const e = await repo.save(repo.create({ nombre: `ms-${i}` }));
      e.nombre = `ms-${i}-b`;
      await repo.save(e);
      muestras.push(((await repo.findOneByOrFail({ id: e.id })).fechaModificacion as Date).getTime() % 1000);
    }
    expect(muestras.some((ms) => ms !== 0)).toBe(true);
  });

  it('repo.update() no pasa por los hooks: con fechaModificacion: new Date() explícito queda con el reloj real', async () => {
    const repo = ds.getRepository(TzPruebaAuditable);
    const e = await repo.save(repo.create({ nombre: 'update-directo' }));

    // Sin la marca explícita, update() deja que MySQL ponga su CURRENT_TIMESTAMP (la hora UTC del
    // servidor leída como -06:00, ~6 h adelantada en este entorno): todo repo.update/QueryBuilder
    // sobre entidades Auditable debe pasar `fechaModificacion: new Date()`.
    const antes = Date.now();
    await repo.update({ id: e.id }, { nombre: 'update-con-marca', fechaModificacion: new Date() });
    const conMarca = (await repo.findOneByOrFail({ id: e.id })).fechaModificacion as Date;
    expect(conMarca.getTime()).toBeGreaterThanOrEqual(antes - 1000);
    expect(Math.abs(conMarca.getTime() - Date.now())).toBeLessThan(HORA);
  });

  it('un save sin cambios no toca la fila ni la marca de modificación', async () => {
    const repo = ds.getRepository(TzPruebaAuditable);
    const e = await repo.save(repo.create({ nombre: 'sin-cambios' }));
    const antes = await repo.findOneByOrFail({ id: e.id });
    await new Promise((r) => setTimeout(r, 30));
    await repo.save(antes);
    const despues = await repo.findOneByOrFail({ id: e.id });
    expect(despues.fechaModificacion?.getTime()).toBe(antes.fechaModificacion?.getTime());
  });
});
