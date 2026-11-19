/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access -- base simulada y respuestas JSON sin tipar */
import { AntecedentePersonal, EjercicioTestMovimiento, TipoAntecedenteTraumatico, TipoEventoImportante } from 'src/modulos/catalogos/entities/catalogos.entities';
import { EvaluacionesBarthelController } from './barthel/evaluaciones-barthel.controller';
import { EvaluacionesBarthelService } from './barthel/evaluaciones-barthel.service';
import { EventosImportantesController } from './eventos-importantes/eventos-importantes.controller';
import { EventosImportantesService } from './eventos-importantes/eventos-importantes.service';
import { AplicacionesTestMovimientoController } from './test-movimiento/aplicaciones-test-movimiento.controller';
import { AplicacionesTestMovimientoService } from './test-movimiento/aplicaciones-test-movimiento.service';
import { EvaluacionesTinettiController } from './tinetti/evaluaciones-tinetti.controller';
import { EvaluacionesTinettiService } from './tinetti/evaluaciones-tinetti.service';
import { AntecedentesValoracionController } from './valoraciones/antecedentes-valoracion.controller';
import { AntecedentesValoracionService } from './valoraciones/antecedentes-valoracion.service';
import { crearDbSimulada } from './valoraciones/testing/db-simulada';
import { esperarSoloAditivo, montarUsuarios, NOMBRE_ELENA, NOMBRE_KARINA, pasarPorInterceptor, tieneElInterceptor } from 'src/common/usuarios/testing/nombres-de-usuario.util';
import { ValoracionesFisioterapeuticasController } from './valoraciones/valoraciones-fisioterapeuticas.controller';
import { ValoracionesFisioterapeuticasService } from './valoraciones/valoraciones-fisioterapeuticas.service';
import { maximoDeItem } from 'src/common/valoraciones/instrumento';
import { ITEMS_TINETTI_V1, ItemsTinetti } from './tinetti/tinetti-v1.instrumento';

/**
 * CA-26 en Terapia Física: cada controller lleva el interceptor y las respuestas REALES de sus servicios salen con los
 * nombres de quien registró / modificó / anuló, conservando todos los campos de siempre y con UNA sola consulta de
 * usuarios por petición. (Elena está eliminada lógicamente: aun así se resuelve.)
 */
const REGISTRA = 5; // Karina
const ANULA = 6; // Elena
const BARTHEL = { comer: 10, lavarse: 5, vestirse: 10, arreglarse: 5, deposiciones: 10, miccion: 10, usarRetrete: 10, trasladarse: 15, deambular: 15, escalones: 10 };
const TINETTI = Object.fromEntries(ITEMS_TINETTI_V1.map((i) => [i.campo, maximoDeItem(i)])) as ItemsTinetti;

const escenario = () => {
  const db = crearDbSimulada([1]);
  db.insertar(AntecedentePersonal, { id: 1, nombre: 'Hipertensión', activo: true });
  db.insertar(TipoAntecedenteTraumatico, { id: 1, nombre: 'Fractura', activo: true });
  db.insertar(TipoEventoImportante, { id: 1, nombre: 'Caída', activo: true });
  db.insertar(EjercicioTestMovimiento, { id: 1, nombre: 'Transferencias', activo: true });
  db.insertar(EjercicioTestMovimiento, { id: 2, nombre: 'Flexiones de hombro', activo: true });
  return { db, ...montarUsuarios(db) };
};

/** Pasa cada respuesta por el interceptor y comprueba lo común: solo aditivo, todos los ids con nombre, ≤ 1 consulta. */
const verificar = async (ctx: ReturnType<typeof escenario>, respuestas: unknown[], esperadosConNombre?: number) => {
  let total = 0;
  for (const original of respuestas) {
    ctx.reiniciar();
    const r = await pasarPorInterceptor(ctx.interceptor, original);
    const { ids, conNombre } = esperarSoloAditivo(original, r);
    expect(ids).toBeGreaterThan(0);
    expect(conNombre).toBe(ids); // todos los ids de usuario traen su nombre
    expect(ctx.consultasDeUsuarios()).toBe(1); // UNA consulta por petición, sea un registro o un listado
    total += ids;
  }
  if (esperadosConNombre !== undefined) expect(total).toBeGreaterThanOrEqual(esperadosConNombre);
};

describe('Terapia Física — nombres de usuario (CA-26)', () => {
  it.each([
    ['valoraciones fisioterapéuticas', ValoracionesFisioterapeuticasController],
    ['antecedentes', AntecedentesValoracionController],
    ['eventos importantes', EventosImportantesController],
    ['test de movimiento', AplicacionesTestMovimientoController],
    ['Barthel', EvaluacionesBarthelController],
    ['Tinetti', EvaluacionesTinettiController],
  ])('el controller de %s lleva el NombresDeUsuarioInterceptor', (_n, controller) => {
    expect(tieneElInterceptor(controller)).toBe(true);
  });

  it('valoración fisioterapéutica: POST, PATCH, confirmar, anular, historial, vigente y detalle (con antecedentes anidados)', async () => {
    const ctx = escenario();
    const svc = new ValoracionesFisioterapeuticasService(ctx.db.dataSource);
    const hijos = new AntecedentesValoracionService(ctx.db.dataSource);
    const creada = await svc.crear(1, { tratamiento: 'Uno' }, REGISTRA);
    await hijos.registrarPersonales(creada.id, { antecedentes: [{ antecedenteId: 1, presente: true }] }, REGISTRA);
    await hijos.crearTraumatico(creada.id, { tipoId: 1 }, REGISTRA);
    // La base simulada devuelve la misma referencia viva: se toma una foto de la respuesta del PATCH.
    const editada: unknown = JSON.parse(JSON.stringify(await svc.actualizar(creada.id, { tratamiento: 'Dos' }, ANULA)));
    const confirmada = await svc.confirmar(creada.id, REGISTRA);
    const otra = await svc.crear(1, {}, REGISTRA);
    const anulada = await svc.anular(otra.id, 'Error', ANULA);
    await verificar(ctx, [creada, editada, confirmada, anulada, await svc.listar(1), await svc.obtenerVigente(1), await svc.obtenerDetalle(creada.id)]);
    // detalle: se resuelven también los hijos anidados
    const detalle = (await pasarPorInterceptor(ctx.interceptor, await svc.obtenerDetalle(creada.id))) as Record<string, any>;
    expect(detalle.creadoPorNombre).toBe(NOMBRE_KARINA);
    expect(detalle.usuarioResponsableNombre).toBe(NOMBRE_KARINA);
    expect(detalle.modificadoPorNombre).toBe(NOMBRE_KARINA); // la última modificación fue la confirmación de Karina
    expect(((await pasarPorInterceptor(ctx.interceptor, editada)) as Record<string, unknown>).modificadoPorNombre).toBe(NOMBRE_ELENA);
    expect(detalle.antecedentesPersonales[0].creadoPorNombre).toBe(NOMBRE_KARINA);
    expect(detalle.antecedentesTraumaticos[0].creadoPorNombre).toBe(NOMBRE_KARINA);
    expect(detalle.avances ?? null).toBeNull(); // los campos de siempre siguen ahí
    const anuladaConNombre = (await pasarPorInterceptor(ctx.interceptor, anulada)) as Record<string, any>;
    expect(anuladaConNombre).toMatchObject({ anulado: true, anuladoPorId: ANULA, anuladoPorNombre: NOMBRE_ELENA, motivoAnulacion: 'Error' });
  });

  it('antecedentes: upsert de personales (arreglo), traumático crear, editar y anular', async () => {
    const ctx = escenario();
    const valoraciones = new ValoracionesFisioterapeuticasService(ctx.db.dataSource);
    const svc = new AntecedentesValoracionService(ctx.db.dataSource);
    const v = await valoraciones.crear(1, {}, REGISTRA);
    const personales = await svc.registrarPersonales(v.id, { antecedentes: [{ antecedenteId: 1, presente: true }] }, REGISTRA);
    const t = await svc.crearTraumatico(v.id, { tipoId: 1 }, REGISTRA);
    const editado = await svc.actualizarTraumatico(t.id, { localizacionAnatomica: 'Cadera' }, ANULA);
    const anulado = await svc.anularTraumatico(t.id, 'Error', ANULA);
    await verificar(ctx, [personales, t, editado, anulado]);
    expect(((await pasarPorInterceptor(ctx.interceptor, anulado)) as Record<string, unknown>).anuladoPorNombre).toBe(NOMBRE_ELENA);
  });

  it('eventos importantes: POST, listado y anular', async () => {
    const ctx = escenario();
    const svc = new EventosImportantesService(ctx.db.dataSource);
    const creado = await svc.crear(1, { tipoEventoId: 1 }, REGISTRA);
    await svc.crear(1, { tipoEventoId: 1 }, ANULA);
    const anulado = await svc.anular(creado.id, 'Duplicado', ANULA);
    await verificar(ctx, [creado, await svc.listar(1, { incluirAnulados: true }), anulado]);
  });

  it('test de movimiento: POST, listado, detalle (con ejercicios) y anular', async () => {
    const ctx = escenario();
    const svc = new AplicacionesTestMovimientoService(ctx.db.dataSource);
    const cuerpo = { ejercicios: [1, 2].map((ejercicioId) => ({ ejercicioId, modalidad: 'Con apoyo', resultado: 'Lo realiza' })) };
    const creada = await svc.crear(1, cuerpo, REGISTRA);
    const anulada = await svc.anular((await svc.crear(1, cuerpo, REGISTRA)).id, 'Error', ANULA);
    await verificar(ctx, [creada, await svc.listar(1, { incluirAnulados: true }), await svc.obtenerDetalle(creada.id), anulada]);
    const r = (await pasarPorInterceptor(ctx.interceptor, await svc.obtenerDetalle(creada.id))) as Record<string, any>;
    expect(r.ejercicios).toHaveLength(2); // los ejercicios siguen anidados, sin cambios
    expect(r.usuarioResponsableNombre).toBe(NOMBRE_KARINA);
  });

  it('Barthel y Tinetti: POST, listado y anular (usuarioExaminadorNombre incluido)', async () => {
    const ctx = escenario();
    const barthel = new EvaluacionesBarthelService(ctx.db.dataSource);
    const tinetti = new EvaluacionesTinettiService(ctx.db.dataSource);
    const b = await barthel.crear(1, BARTHEL, REGISTRA);
    const bAnulada = await barthel.anular((await barthel.crear(1, BARTHEL, REGISTRA)).id, 'Error', ANULA);
    const t = await tinetti.crear(1, { ...TINETTI }, REGISTRA);
    const tAnulada = await tinetti.anular((await tinetti.crear(1, { ...TINETTI }, REGISTRA)).id, 'Error', ANULA);
    await verificar(ctx, [b, bAnulada, await barthel.listar(1, { incluirAnulados: true }), t, tAnulada, await tinetti.listar(1, { incluirAnulados: true })]);
    const r = (await pasarPorInterceptor(ctx.interceptor, b)) as Record<string, unknown>;
    expect(r).toMatchObject({ usuarioExaminadorId: REGISTRA, usuarioExaminadorNombre: NOMBRE_KARINA, puntajeTotal: 100 });
  });

  it('un listado grande (30 registros de dos usuarios) hace UNA sola consulta de usuarios', async () => {
    const ctx = escenario();
    const svc = new EvaluacionesBarthelService(ctx.db.dataSource);
    for (let i = 0; i < 30; i++) await svc.crear(1, BARTHEL, i % 2 ? REGISTRA : ANULA);
    const lista = await svc.listar(1, {});
    expect(lista).toHaveLength(30);
    ctx.reiniciar();
    const r = (await pasarPorInterceptor(ctx.interceptor, lista)) as Record<string, unknown>[];
    expect(ctx.consultasDeUsuarios()).toBe(1);
    expect(r.filter((f) => f.usuarioExaminadorNombre === NOMBRE_KARINA)).toHaveLength(15);
    expect(r.filter((f) => f.usuarioExaminadorNombre === NOMBRE_ELENA)).toHaveLength(15);
  });
});
