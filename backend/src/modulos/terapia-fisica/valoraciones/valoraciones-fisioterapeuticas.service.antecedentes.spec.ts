/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return -- base simulada en memoria */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EstadoValoracion } from 'src/common/enums/estadoValoracion.enum';
import { AntecedentePersonal, TipoAntecedenteTraumatico } from 'src/modulos/catalogos/entities/catalogos.entities';
import { AntecedenteTraumatico } from '../entities/antecedente-traumatico.entity';
import { ValoracionFisioterapeutica } from '../entities/valoracion-fisioterapeutica.entity';
import { ValoracionTfAntecedentePersonal } from '../entities/valoracion-tf-antecedente-personal.entity';
import { crearDbSimulada } from './testing/db-simulada';
import { ValoracionesFisioterapeuticasService } from './valoraciones-fisioterapeuticas.service';

/** `confirmar` exige evaluar todos los antecedentes personales ACTIVOS (decisión BE-2b) + detalle/vigente con hijos. */
const escenario = (nAntecedentes = 17) => {
  const db = crearDbSimulada([1]);
  for (let i = 1; i <= nAntecedentes; i++) db.insertar(AntecedentePersonal, { id: i, nombre: `Antecedente ${i}`, activo: true });
  db.insertar(TipoAntecedenteTraumatico, { id: 1, nombre: 'Fractura', activo: true });
  db.insertar(TipoAntecedenteTraumatico, { id: 2, nombre: 'Esguince', activo: false });
  const svc = new ValoracionesFisioterapeuticasService(db.dataSource);
  let seq = 100;
  const valoracion = (parcial: object = {}) =>
    db.insertar(ValoracionFisioterapeutica, {
      id: ++seq,
      expedienteId: 1,
      fecha: '2026-10-01',
      estado: EstadoValoracion.BORRADOR,
      anulado: false,
      presentaDolor: false,
      ...parcial,
    });
  const evaluar = (valoracionId: number, antecedenteIds: number[], presente = false) =>
    antecedenteIds.forEach((antecedenteId) => db.insertar(ValoracionTfAntecedentePersonal, { valoracionId, antecedenteId, presente, observacion: null }));
  return { db, svc, valoracion, evaluar };
};

const capturar = async (p: Promise<unknown>): Promise<any> => {
  try {
    await p;
  } catch (e) {
    return e;
  }
  return undefined;
};

describe('confirmar exige evaluar todos los antecedentes personales ACTIVOS (RF-TF-02)', () => {
  it('sin ninguno evaluado: 400 con los 17 pendientes en `faltantes` y en `antecedentesPersonalesPendientes`', async () => {
    const { svc, valoracion } = escenario(17);
    const v = valoracion();
    const error = await capturar(svc.confirmar(v.id, 9));
    expect(error).toBeInstanceOf(BadRequestException);
    const r = error.getResponse();
    expect(r.faltantes).toHaveLength(17);
    expect(r.faltantes[0]).toBe('antecedentePersonal:1');
    expect(r.antecedentesPersonalesPendientes).toHaveLength(17);
    expect(r.antecedentesPersonalesPendientes[0]).toEqual({ id: 1, nombre: 'Antecedente 1' });
    expect(v.estado).toBe(EstadoValoracion.BORRADOR);
  });

  it('con parte evaluada: solo lista los que faltan (presente o descartado cuentan igual)', async () => {
    const { svc, valoracion, evaluar } = escenario(17);
    const v = valoracion();
    evaluar(v.id, Array.from({ length: 15 }, (_, i) => i + 1));
    const error = await capturar(svc.confirmar(v.id, 9));
    expect(error.getResponse().faltantes).toEqual(['antecedentePersonal:16', 'antecedentePersonal:17']);
    expect(error.getResponse().antecedentesPersonalesPendientes.map((p: any) => p.nombre)).toEqual(['Antecedente 16', 'Antecedente 17']);
  });

  it('con todos evaluados: confirma y queda vigente', async () => {
    const { svc, valoracion, evaluar } = escenario(17);
    const v = valoracion();
    evaluar(v.id, Array.from({ length: 17 }, (_, i) => i + 1));
    await expect(svc.confirmar(v.id, 9)).resolves.toMatchObject({ estado: EstadoValoracion.VIGENTE });
  });

  it('no asume cantidad: con 30 ítems activos exige los 30', async () => {
    const { svc, valoracion, evaluar } = escenario(30);
    const v = valoracion();
    evaluar(v.id, Array.from({ length: 29 }, (_, i) => i + 1));
    expect((await capturar(svc.confirmar(v.id, 9))).getResponse().faltantes).toEqual(['antecedentePersonal:30']);
  });

  it('se combinan con los campos faltantes de la cabecera en el mismo `faltantes`', async () => {
    const { svc, valoracion, evaluar } = escenario(3);
    const v = valoracion({ presentaDolor: true }); // dolor sin zona ni intensidad
    evaluar(v.id, [1, 2]);
    const r = (await capturar(svc.confirmar(v.id, 9))).getResponse();
    expect(r.faltantes).toEqual(['zonaDolorosa', 'intensidadDolor', 'antecedentePersonal:3']);
    expect(r.antecedentesPersonalesPendientes).toEqual([{ id: 3, nombre: 'Antecedente 3' }]);
  });

  it('400 sin cambios: la vigente anterior no se desplaza y el borrador sigue borrador', async () => {
    const { svc, valoracion, db } = escenario(3);
    const vieja = valoracion({ estado: EstadoValoracion.VIGENTE });
    const nueva = valoracion();
    await capturar(svc.confirmar(nueva.id, 9));
    expect(vieja.estado).toBe(EstadoValoracion.VIGENTE);
    expect(nueva.estado).toBe(EstadoValoracion.BORRADOR);
    expect(db.log.some((e) => e.startsWith('update:'))).toBe(false);
  });

  it('un ítem DESACTIVADO antes de evaluarse deja de exigirse', async () => {
    const { svc, valoracion, evaluar, db } = escenario(3);
    const v = valoracion();
    evaluar(v.id, [1, 2]);
    db.filas(AntecedentePersonal)[2].activo = false; // «Antecedente 3» desactivado
    await expect(svc.confirmar(v.id, 9)).resolves.toMatchObject({ estado: EstadoValoracion.VIGENTE });
  });

  it('un ítem ya evaluado y luego desactivado no estorba (su fila se conserva)', async () => {
    const { svc, valoracion, evaluar, db } = escenario(3);
    const v = valoracion();
    evaluar(v.id, [1, 2, 3]);
    db.filas(AntecedentePersonal)[0].activo = false;
    await expect(svc.confirmar(v.id, 9)).resolves.toMatchObject({ estado: EstadoValoracion.VIGENTE });
  });

  it('un ítem AGREGADO al catálogo mientras hay un borrador abierto también se exige', async () => {
    const { svc, valoracion, evaluar, db } = escenario(3);
    const v = valoracion();
    evaluar(v.id, [1, 2, 3]);
    db.insertar(AntecedentePersonal, { id: 4, nombre: 'Antecedente nuevo', activo: true });
    expect((await capturar(svc.confirmar(v.id, 9))).getResponse().antecedentesPersonalesPendientes).toEqual([
      { id: 4, nombre: 'Antecedente nuevo' },
    ]);
  });

  it('catálogo sin ítems activos → no se exige nada', async () => {
    const { svc, valoracion } = escenario(0);
    const v = valoracion();
    await expect(svc.confirmar(v.id, 9)).resolves.toMatchObject({ estado: EstadoValoracion.VIGENTE });
  });

  it('las evaluaciones de OTRA valoración no cuentan', async () => {
    const { svc, valoracion, evaluar } = escenario(2);
    const otra = valoracion();
    const v = valoracion();
    evaluar(otra.id, [1, 2]);
    expect((await capturar(svc.confirmar(v.id, 9))).getResponse().faltantes).toEqual(['antecedentePersonal:1', 'antecedentePersonal:2']);
  });

  it('los antecedentes traumáticos NO se exigen (0..N: «sin antecedentes» = sin registros)', async () => {
    const { svc, valoracion, evaluar, db } = escenario(2);
    const v = valoracion();
    evaluar(v.id, [1, 2]);
    expect(db.filas(AntecedenteTraumatico)).toHaveLength(0);
    await expect(svc.confirmar(v.id, 9)).resolves.toMatchObject({ estado: EstadoValoracion.VIGENTE });
  });
});

describe('lectura con hijos: GET /:id, GET vigente e historial', () => {
  const conHijos = () => {
    const e = escenario(3);
    const v = e.valoracion({ estado: EstadoValoracion.VIGENTE });
    e.db.insertar(ValoracionTfAntecedentePersonal, { valoracionId: v.id, antecedenteId: 1, presente: true, observacion: 'Desde 2019' });
    e.db.insertar(ValoracionTfAntecedentePersonal, { valoracionId: v.id, antecedenteId: 2, presente: false, observacion: null });
    e.db.insertar(AntecedenteTraumatico, { valoracionId: v.id, tipoId: 1, descripcion: 'Cadera', anulado: false });
    e.db.insertar(AntecedenteTraumatico, { valoracionId: v.id, tipoId: 1, descripcion: 'Retirada', anulado: true, motivoAnulacion: 'Error' });
    e.db.insertar(AntecedenteTraumatico, { valoracionId: v.id, tipoId: 2, descripcion: 'Con tipo inactivo', anulado: false });
    return { ...e, v };
  };

  it('GET /:id devuelve la valoración con sus personales (incluido presente=false) y los traumáticos NO anulados', async () => {
    const { svc, v } = conHijos();
    const d = await svc.obtenerDetalle(v.id);
    expect(d).toMatchObject({ id: v.id, estado: 'vigente', expedienteId: 1 });
    expect(d.antecedentesPersonales.map((p) => [p.antecedenteId, p.nombre, p.presente, p.observacion])).toEqual([
      [1, 'Antecedente 1', true, 'Desde 2019'],
      [2, 'Antecedente 2', false, null],
    ]);
    expect(d.antecedentesTraumaticos.map((t) => t.descripcion)).toEqual(['Cadera', 'Con tipo inactivo']); // sin la anulada
  });

  it('un tipo de catálogo desactivado se sigue resolviendo en el detalle (histórico)', async () => {
    const { svc, v } = conHijos();
    const d = await svc.obtenerDetalle(v.id);
    expect(d.antecedentesTraumaticos[1].tipo).toEqual({ id: 2, nombre: 'Esguince', activo: false });
  });

  it('el detalle funciona con cualquier estado (borrador, reemplazada, anulada) y sin hijos', async () => {
    const { svc, valoracion } = escenario(2);
    for (const parcial of [{ estado: EstadoValoracion.BORRADOR }, { estado: EstadoValoracion.REEMPLAZADA }, { anulado: true }]) {
      const v = valoracion(parcial);
      await expect(svc.obtenerDetalle(v.id)).resolves.toMatchObject({ id: v.id, antecedentesPersonales: [], antecedentesTraumaticos: [] });
    }
  });

  it('GET /:id inexistente → 404', async () => {
    await expect(escenario().svc.obtenerDetalle(999)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('GET vigente INCLUYE los hijos', async () => {
    const { svc } = conHijos();
    const d = await svc.obtenerVigente(1);
    expect(d.antecedentesPersonales).toHaveLength(2);
    expect(d.antecedentesTraumaticos).toHaveLength(2);
  });

  it('el historial devuelve solo cabeceras (sin hijos); el detalle se pide por GET /:id', async () => {
    const { svc } = conHijos();
    const historial = await svc.listar(1);
    expect(historial).toHaveLength(1);
    expect(historial[0]).not.toHaveProperty('antecedentesPersonales');
    expect(historial[0]).not.toHaveProperty('antecedentesTraumaticos');
  });
});
