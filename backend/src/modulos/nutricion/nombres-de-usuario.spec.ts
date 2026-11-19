/* eslint-disable @typescript-eslint/no-unsafe-argument -- base simulada en memoria */
import { DatoFuncionalNutricion } from 'src/modulos/catalogos/entities/catalogos.entities';
import { crearDbSimulada } from 'src/modulos/terapia-fisica/valoraciones/testing/db-simulada';
import {
  esperarSoloAditivo,
  montarUsuarios,
  NOMBRE_ELENA,
  NOMBRE_KARINA,
  pasarPorInterceptor,
  tieneElInterceptor,
} from 'src/common/usuarios/testing/nombres-de-usuario.util';
import { ControlesNutricionalesController } from './controles/controles-nutricionales.controller';
import { ControlesNutricionalesService } from './controles/controles-nutricionales.service';
import { EvaluacionesMnaController } from './mna/evaluaciones-mna.controller';
import { EvaluacionesMnaService } from './mna/evaluaciones-mna.service';
import { ValoracionesNutricionalesController } from './valoraciones/valoraciones-nutricionales.controller';
import { ValoracionesNutricionalesService } from './valoraciones/valoraciones-nutricionales.service';

/**
 * CA-26 en Nutrición: cada controller lleva el interceptor y las respuestas REALES de sus servicios salen con los
 * nombres de quien registró / modificó / anuló, conservando todos los campos de siempre y con UNA sola consulta de
 * usuarios por petición. (Elena está eliminada lógicamente: aun así se resuelve.) Las vistas previas no traen ids.
 */
const REGISTRA = 5; // Karina
const ANULA = 6; // Elena
const MNA = { itemA: 2, itemB: 3, itemC: 2, itemD: 2, itemE: 2, itemF: 3 };

const escenario = () => {
  const db = crearDbSimulada([1]);
  db.insertar(DatoFuncionalNutricion, { id: 2, nombre: 'Deambula con ayuda', activo: true });
  return { db, ...montarUsuarios(db) };
};

const verificar = async (ctx: ReturnType<typeof escenario>, respuestas: unknown[]) => {
  for (const original of respuestas) {
    ctx.reiniciar();
    const r = await pasarPorInterceptor(ctx.interceptor, original);
    const { ids, conNombre } = esperarSoloAditivo(original, r);
    expect(ids).toBeGreaterThan(0);
    expect(conNombre).toBe(ids);
    expect(ctx.consultasDeUsuarios()).toBe(1);
  }
};

describe('Nutrición — nombres de usuario (CA-26)', () => {
  it.each([
    ['valoraciones nutricionales', ValoracionesNutricionalesController],
    ['controles nutricionales', ControlesNutricionalesController],
    ['MNA', EvaluacionesMnaController],
  ])('el controller de %s lleva el NombresDeUsuarioInterceptor', (_n, controller) => {
    expect(tieneElInterceptor(controller)).toBe(true);
  });

  it('valoración nutricional: POST, PATCH, confirmar, anular, historial, vigente y detalle', async () => {
    const ctx = escenario();
    const svc = new ValoracionesNutricionalesService(ctx.db.dataSource);
    const creada = await svc.crear(1, { datoFuncionalId: 2, problemaVisual: false }, REGISTRA);
    // La base simulada devuelve la misma referencia viva: se toma una foto de la respuesta del PATCH.
    const editada: unknown = JSON.parse(JSON.stringify(await svc.actualizar(creada.id, { problemaVisual: true }, ANULA)));
    const confirmada = await svc.confirmar(creada.id, REGISTRA);
    const otra = await svc.crear(1, { datoFuncionalId: 2 }, REGISTRA);
    const anulada = await svc.anular(otra.id, 'Error', ANULA);
    await verificar(ctx, [creada, editada, confirmada, anulada, await svc.listar(1), await svc.obtenerVigente(1), await svc.obtenerDetalle(creada.id)]);
    const detalle = (await pasarPorInterceptor(ctx.interceptor, await svc.obtenerDetalle(creada.id))) as Record<string, any>;
    expect(detalle).toMatchObject({ usuarioResponsableNombre: NOMBRE_KARINA, creadoPorNombre: NOMBRE_KARINA, modificadoPorNombre: NOMBRE_KARINA });
    expect(detalle.datoFuncional).toMatchObject({ id: 2, nombre: 'Deambula con ayuda' }); // el dato funcional resuelto sigue igual
    expect(((await pasarPorInterceptor(ctx.interceptor, editada)) as Record<string, unknown>).modificadoPorNombre).toBe(NOMBRE_ELENA);
    expect(await pasarPorInterceptor(ctx.interceptor, anulada)).toMatchObject({ anulado: true, anuladoPorId: ANULA, anuladoPorNombre: NOMBRE_ELENA });
  });

  it('control nutricional: POST, serie con variaciones y anular', async () => {
    const ctx = escenario();
    const svc = new ControlesNutricionalesService(ctx.db.dataSource);
    const c1 = await svc.crear(1, { peso: 58.4, talla: 152, fecha: '2026-09-01' }, REGISTRA);
    const c2 = await svc.crear(1, { peso: 57, talla: 152, fecha: '2026-10-01' }, REGISTRA);
    const anulado = await svc.anular(c1.id, 'Peso mal digitado', ANULA);
    await verificar(ctx, [c2, anulado, await svc.listar(1, { incluirAnulados: true })]);
    const serie = (await pasarPorInterceptor(ctx.interceptor, await svc.listar(1, { incluirAnulados: true }))) as Record<string, unknown>[];
    expect(serie[0]).toMatchObject({ creadoPorNombre: NOMBRE_KARINA }); // y siguen las variaciones de siempre
    expect(Object.keys(serie[0])).toEqual(expect.arrayContaining(['variacionPeso', 'variacionImc', 'imc']));
    expect(serie.find((f) => f.anulado)).toMatchObject({ anuladoPorNombre: NOMBRE_ELENA });
  });

  it('MNA: POST, listado y anular; la VISTA PREVIA no trae ids ⇒ no se toca ni se consulta', async () => {
    const ctx = escenario();
    const svc = new EvaluacionesMnaService(ctx.db.dataSource);
    const e = await svc.crear(1, MNA as never, REGISTRA);
    const anulada = await svc.anular((await svc.crear(1, MNA as never, REGISTRA)).id, 'Error', ANULA);
    await verificar(ctx, [e, anulada, await svc.listar(1, { incluirAnulados: true })]);
    expect(await pasarPorInterceptor(ctx.interceptor, e)).toMatchObject({ usuarioResponsableNombre: NOMBRE_KARINA, subtotalCribaje: 14 });

    const vista = await svc.calcular(1, MNA as never);
    ctx.reiniciar();
    expect(await pasarPorInterceptor(ctx.interceptor, vista)).toBe(vista); // misma referencia, intacta
    expect(ctx.consultasDeUsuarios()).toBe(0);
  });

  it('un listado grande (30 controles de dos usuarios) hace UNA sola consulta de usuarios', async () => {
    const ctx = escenario();
    const svc = new ControlesNutricionalesService(ctx.db.dataSource);
    for (let i = 0; i < 30; i++) await svc.crear(1, { peso: 50 + i, talla: 152 }, i % 2 ? REGISTRA : ANULA);
    const lista = await svc.listar(1, {});
    ctx.reiniciar();
    const r = (await pasarPorInterceptor(ctx.interceptor, lista)) as Record<string, unknown>[];
    expect(r).toHaveLength(30);
    expect(ctx.consultasDeUsuarios()).toBe(1);
    expect(r.filter((f) => f.creadoPorNombre === NOMBRE_KARINA)).toHaveLength(15);
    expect(r.filter((f) => f.creadoPorNombre === NOMBRE_ELENA)).toHaveLength(15);
  });
});
