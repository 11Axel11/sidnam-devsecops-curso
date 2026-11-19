import 'reflect-metadata';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MysqlQueryRunner } from 'typeorm/driver/mysql/MysqlQueryRunner';
import { lastValueFrom, of } from 'rxjs';
import { Estado_Usuario } from 'src/common/enums/esatadoUsuario.enum';
import { ControlesNutricionalesService } from 'src/modulos/nutricion/controles/controles-nutricionales.service';
import { ValoracionesNutricionalesService } from 'src/modulos/nutricion/valoraciones/valoraciones-nutricionales.service';
import { RolUsuario } from 'src/modulos/gestion-usuario/entities/rol.entity';
import { Usuario } from 'src/modulos/gestion-usuario/entities/usuario.entity';
import { EvaluacionesBarthelService } from 'src/modulos/terapia-fisica/barthel/evaluaciones-barthel.service';
import { abrirDataSourceDeIntegracion, INTEGRACION_ACTIVA, nuevoExpediente, nuevoExpedienteConResidente } from 'src/modulos/terapia-fisica/valoraciones/testing/integracion';
import { NombresDeUsuarioInterceptor } from './nombres-de-usuario.interceptor';
import { resolverUsuarios } from './resolver-usuarios';

/**
 * INTEGRACIÓN con MySQL REAL (opt-in) de los nombres de usuario (CA-26): activo, inactivo y eliminado (borrado lógico) se
 * resuelven; un listado cuesta UNA sentencia sobre `usuario`; la respuesta serializada no expone nada sensible.
 *
 *   RUN_DB_INTEGRATION=1 DB_TEST_NAME=sidnam_scratch_b4 npx jest integration --runInBand
 */
const BARTHEL = { comer: 10, lavarse: 5, vestirse: 10, arreglarse: 5, deposiciones: 10, miccion: 10, usarRetrete: 10, trasladarse: 15, deambular: 15, escalones: 10 };
const SECRETO = 'hash-secreto-que-jamas-debe-salir';

(INTEGRACION_ACTIVA ? describe : describe.skip)('Nombres de usuario — integración MySQL (CA-26)', () => {
  jest.setTimeout(240_000);
  let ds: DataSource;
  let interceptor: NombresDeUsuarioInterceptor;
  let barthel: EvaluacionesBarthelService;
  let controles: ControlesNutricionalesService;
  let nutri: ValoracionesNutricionalesService;
  let activo: Usuario;
  let inactivo: Usuario;
  let eliminado: Usuario;
  let sinApellido2: Usuario;

  beforeAll(async () => {
    ds = await abrirDataSourceDeIntegracion();
    interceptor = new NombresDeUsuarioInterceptor(ds);
    barthel = new EvaluacionesBarthelService(ds);
    controles = new ControlesNutricionalesService(ds);
    nutri = new ValoracionesNutricionalesService(ds);
    const rol = await ds.getRepository(RolUsuario).save({ nombre: 'Rol de prueba', descripcion: 'CA-26', estado: true });
    const sufijo = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const crear = (n: string, name: string, apellido1: string, apellido2: string | null, estado: Estado_Usuario) =>
      ds.getRepository(Usuario).save({ cedula: `ced-${n}-${sufijo}`, email: `${n}-${sufijo}@prueba.local`, name, apellido1, apellido2: apellido2 as string, password: SECRETO, rol, estado });
    activo = await crear('a', 'Karina', 'Mora', 'Díaz', Estado_Usuario.activo);
    inactivo = await crear('i', 'Marta', 'Quesada', 'Solís', Estado_Usuario.inactivo);
    eliminado = await crear('e', 'Elena', 'Rojas', 'Vargas', Estado_Usuario.activo);
    sinApellido2 = await crear('s', 'Luis', 'Vega', null, Estado_Usuario.activo);
    await ds.getRepository(Usuario).softDelete(eliminado.id); // borrado lógico (deletedAt)
  });

  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  const pasar = (respuesta: unknown): Promise<unknown> =>
    lastValueFrom(interceptor.intercept({} as ExecutionContext, { handle: () => of(respuesta) } as CallHandler));

  /** Cuenta las sentencias SQL reales sobre la tabla `usuario` mientras corre `fn`. */
  const contarConsultasDeUsuarios = async (fn: () => Promise<unknown>): Promise<number> => {
    const espia = jest.spyOn(MysqlQueryRunner.prototype, 'query');
    try {
      await fn();
      return espia.mock.calls.filter(([sql]) => typeof sql === 'string' && /FROM `usuario`/i.test(sql)).length;
    } finally {
      espia.mockRestore();
    }
  };

  it('el usuario ELIMINADO lógicamente (deletedAt) y el INACTIVO se resuelven igual (histórico); el que no existe es null', async () => {
    const mapa = await resolverUsuarios(ds, [activo.id, inactivo.id, eliminado.id, sinApellido2.id, 999_999_999]);
    expect(mapa.get(activo.id)).toBe('Karina Mora Díaz');
    expect(mapa.get(inactivo.id)).toBe('Marta Quesada Solís');
    expect(mapa.get(eliminado.id)).toBe('Elena Rojas Vargas'); // sin withDeleted saldría ausente
    expect(mapa.get(sinApellido2.id)).toBe('Luis Vega');
    expect(mapa.has(999_999_999)).toBe(false);
    expect(await ds.getRepository(Usuario).findOneBy({ id: eliminado.id })).toBeNull(); // confirma que TypeORM lo oculta por defecto
  });

  it('Barthel con registrador activo, anulado por un eliminado: nombres correctos y todo lo de siempre intacto', async () => {
    const exp = await nuevoExpediente(ds);
    const e = await barthel.crear(exp, BARTHEL, activo.id);
    const anulada = await barthel.anular(e.id, 'Registrada por error', eliminado.id);
    const r = (await pasar(anulada)) as Record<string, unknown>;
    expect(r).toMatchObject({
      creadoPorId: activo.id, creadoPorNombre: 'Karina Mora Díaz',
      usuarioExaminadorId: activo.id, usuarioExaminadorNombre: 'Karina Mora Díaz',
      anuladoPorId: eliminado.id, anuladoPorNombre: 'Elena Rojas Vargas',
      modificadoPorId: eliminado.id, modificadoPorNombre: 'Elena Rojas Vargas',
      anulado: true, motivoAnulacion: 'Registrada por error', puntajeTotal: 100,
    });
    expect(r.fechaCreacion).toBeInstanceOf(Date); // las fechas siguen siendo fechas
  });

  it('un listado de 12 registros de 3 usuarios hace UNA sola sentencia sobre `usuario`', async () => {
    const exp = await nuevoExpediente(ds);
    const quienes = [activo.id, inactivo.id, eliminado.id];
    for (let i = 0; i < 12; i++) await barthel.crear(exp, BARTHEL, quienes[i % 3]);
    const lista = await barthel.listar(exp, {});
    expect(lista).toHaveLength(12);
    let respuesta: Record<string, unknown>[] = [];
    const consultas = await contarConsultasDeUsuarios(async () => {
      respuesta = (await pasar(lista)) as Record<string, unknown>[];
    });
    expect(consultas).toBe(1);
    expect(respuesta.map((f) => f.usuarioExaminadorNombre)).toEqual(expect.arrayContaining(['Karina Mora Díaz', 'Marta Quesada Solís', 'Elena Rojas Vargas']));
    expect(respuesta.every((f) => typeof f.usuarioExaminadorNombre === 'string')).toBe(true);
  });

  it('sin ids de usuario (p. ej. una vista previa) no hay NINGUNA sentencia sobre `usuario`', async () => {
    const consultas = await contarConsultasDeUsuarios(() => pasar({ subtotalCribaje: 9, segundaParte: { requerida: true } }));
    expect(consultas).toBe(0);
  });

  it('valoración nutricional y control nutricional: nombres reales también en estos módulos', async () => {
    const exp = await nuevoExpedienteConResidente(ds, new Date('1940-05-12'));
    const v = await nutri.crear(exp, {}, inactivo.id);
    const c = await controles.crear(exp, { peso: 58.4, talla: 152 }, sinApellido2.id);
    expect(await pasar(v)).toMatchObject({ usuarioResponsableNombre: 'Marta Quesada Solís', creadoPorNombre: 'Marta Quesada Solís', modificadoPorNombre: null });
    expect(await pasar(c)).toMatchObject({ creadoPorNombre: 'Luis Vega', imc: 25.3 });
  });

  it('la respuesta serializada NO expone nada sensible (cédula, correo, contraseña, token, rol)', async () => {
    const exp = await nuevoExpediente(ds);
    const e = await barthel.crear(exp, BARTHEL, activo.id);
    const json = JSON.stringify(await pasar(e));
    for (const sensible of [SECRETO, activo.cedula, activo.email, 'refreshToken', 'password', 'cedula', 'email', 'Rol de prueba']) {
      expect(json).not.toContain(sensible);
    }
  });
});
