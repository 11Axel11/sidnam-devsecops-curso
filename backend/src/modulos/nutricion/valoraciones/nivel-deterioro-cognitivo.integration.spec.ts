import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DatoFuncionalNutricion } from 'src/modulos/catalogos/entities/catalogos.entities';
import { DATOS_FUNCIONALES_NUTRICION } from 'src/modulos/catalogos/seed/catalogos-iniciales';
import {
  abrirDataSourceDeIntegracion,
  INTEGRACION_ACTIVA,
  nuevoExpediente,
} from 'src/modulos/terapia-fisica/valoraciones/testing/integracion';
import { ValoracionNutricional } from '../entities/valoracion-nutricional.entity';
import { EstadoCognitivo } from '../enums/estado-cognitivo.enum';
import { NIVELES_DETERIORO_COGNITIVO } from '../enums/nivel-deterioro-cognitivo';
import { ValoracionesNutricionalesService } from './valoraciones-nutricionales.service';

/**
 * INTEGRACIÓN con MySQL REAL (opt-in) del `nivelDeterioroCognitivo` como lista cerrada: cada valor persiste y se
 * relee idéntico, confirmar lo exige con `con_deterioro`, y la columna sigue siendo `varchar(255)` (sin ALTER).
 *
 *   RUN_DB_INTEGRATION=1 DB_TEST_NAME=sidnam_scratch_c1 npx jest integration --runInBand
 */
(INTEGRACION_ACTIVA ? describe : describe.skip)('Nivel de deterioro cognitivo — integración MySQL', () => {
  jest.setTimeout(240_000);
  let ds: DataSource;
  let svc: ValoracionesNutricionalesService;
  let datoFuncionalId: number;

  beforeAll(async () => {
    ds = await abrirDataSourceDeIntegracion();
    svc = new ValoracionesNutricionalesService(ds);
    const repo = ds.getRepository(DatoFuncionalNutricion);
    if ((await repo.count()) === 0) await repo.save(DATOS_FUNCIONALES_NUTRICION.map((nombre) => repo.create({ nombre, activo: true })));
    await ds.createQueryBuilder().update(DatoFuncionalNutricion).set({ activo: true }).execute();
    datoFuncionalId = (await repo.findOneByOrFail({ nombre: 'Deambula con ayuda' })).id;
  });

  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  const leer = (id: number) => ds.getRepository(ValoracionNutricional).findOneByOrFail({ id });

  it.each(NIVELES_DETERIORO_COGNITIVO)('«%s» se guarda, se confirma y se relee idéntico', async (nivel) => {
    const exp = await nuevoExpediente(ds);
    const v = await svc.crear(exp, { datoFuncionalId, estadoCognitivo: EstadoCognitivo.CON_DETERIORO, nivelDeterioroCognitivo: nivel }, 1);
    await svc.confirmar(v.id, 1);
    expect(await leer(v.id)).toMatchObject({ estadoCognitivo: 'con_deterioro', nivelDeterioroCognitivo: nivel });
  });

  it('con_deterioro sin nivel no se puede confirmar (400 faltantes); con el nivel sí', async () => {
    const exp = await nuevoExpediente(ds);
    const v = await svc.crear(exp, { datoFuncionalId, estadoCognitivo: EstadoCognitivo.CON_DETERIORO }, 1);
    const e = await svc.confirmar(v.id, 1).then(
      () => undefined,
      (x: unknown) => x as BadRequestException,
    );
    expect((e!.getResponse() as { faltantes: string[] }).faltantes).toEqual(['nivelDeterioroCognitivo']);
    await svc.actualizar(v.id, { nivelDeterioroCognitivo: 'moderado' }, 1);
    await expect(svc.confirmar(v.id, 1)).resolves.toMatchObject({ estado: 'vigente' });
  });

  it('PATCH leve → severo y a null (limpia), y un nivel con estado normal es 400', async () => {
    const exp = await nuevoExpediente(ds);
    const v = await svc.crear(exp, { estadoCognitivo: EstadoCognitivo.CON_DETERIORO, nivelDeterioroCognitivo: 'leve' }, 1);
    await svc.actualizar(v.id, { nivelDeterioroCognitivo: 'severo' }, 1);
    expect((await leer(v.id)).nivelDeterioroCognitivo).toBe('severo');
    await svc.actualizar(v.id, { nivelDeterioroCognitivo: null }, 1);
    expect((await leer(v.id)).nivelDeterioroCognitivo).toBeNull();
    await expect(svc.crear(exp, { nivelDeterioroCognitivo: 'leve' }, 1)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('un valor anterior a la lista cerrada (texto libre, p. ej. «Leve») se lee tal cual: el backend no lo reescribe', async () => {
    const exp = await nuevoExpediente(ds);
    const v = await svc.crear(exp, { estadoCognitivo: EstadoCognitivo.CON_DETERIORO, nivelDeterioroCognitivo: 'leve' }, 1);
    await ds.query('UPDATE valoracion_nutricional SET nivelDeterioroCognitivo = ? WHERE id = ?', ['Leve', v.id]);
    expect((await svc.listar(exp))[0].nivelDeterioroCognitivo).toBe('Leve');
  });

  it('esquema: la columna sigue siendo varchar(255) NULL (la lista se valida en el DTO; no hay ALTER)', async () => {
    const cols: { COLUMN_TYPE: string; IS_NULLABLE: string }[] = await ds.query(
      "SELECT COLUMN_TYPE, IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'valoracion_nutricional' AND COLUMN_NAME = 'nivelDeterioroCognitivo'",
    );
    expect(cols[0]).toEqual({ COLUMN_TYPE: 'varchar(255)', IS_NULLABLE: 'YES' });
  });
});
