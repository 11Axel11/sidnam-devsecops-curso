/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- base simulada en memoria */
/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
import { BadRequestException } from '@nestjs/common';
import { EstadoValoracion } from 'src/common/enums/estadoValoracion.enum';
import { EjercicioTestMovimiento } from 'src/modulos/catalogos/entities/catalogos.entities';
import { Expediente_Residente } from 'src/modulos/residentes/entities/expedientes.entity';
import { AplicacionTestMovimientoEjercicio } from '../entities/aplicacion-test-movimiento-ejercicio.entity';
import { AplicacionTestMovimiento } from '../entities/aplicacion-test-movimiento.entity';
import { EvaluacionBarthel } from '../entities/evaluacion-barthel.entity';
import { EvaluacionTinetti } from '../entities/evaluacion-tinetti.entity';
import { ValoracionFisioterapeutica } from '../entities/valoracion-fisioterapeutica.entity';
import { crearDbSimulada } from '../valoraciones/testing/db-simulada';
import { ReporteSemestralService } from './reporte-semestral.service';

/**
 * Reporte semestral (RF-TF-12) con base simulada. TODOS los datos son FICTICIOS.
 * `hoy` se inyecta: el servicio nunca depende del reloj en las pruebas.
 */
const HOY = '2026-11-02';

const NOMBRES: Record<number, [string, string, string | null]> = {
  1: ['Residente', 'Zeta', 'Ficticio'],
  2: ['Residente', 'Álvarez', 'Ficticio'],
  3: ['Residente', 'Alvarez', 'Beta'],
  4: ['Residente', 'Pendiente', 'Ficticio'],
  5: ['Residente', 'Inactivo', 'Ficticio'],
};

const escenario = (inactivos: number[] = []) => {
  const db = crearDbSimulada([1, 2, 3, 4, 5], {}, inactivos);
  for (const e of db.filas(Expediente_Residente)) {
    const [nombre, apellido1, apellido2] = NOMBRES[e.id_expediente];
    Object.assign(e.residente, { nombre, apellido1, apellido2 });
  }
  const svc = new ReporteSemestralService(db.dataSource, {} as never);
  const barthel = (p: object) => db.insertar(EvaluacionBarthel, { expedienteId: 1, fecha: '2026-03-01', puntajeTotal: 70, gradoDependencia: 'Dependencia Moderada', anulado: false, ...p });
  const tinetti = (p: object) => db.insertar(EvaluacionTinetti, { expedienteId: 1, fecha: '2026-03-01', puntajeTotal: 20, puntajeEquilibrio: 12, puntajeMarcha: 8, anulado: false, ...p });
  const tf = (p: object) => db.insertar(ValoracionFisioterapeutica, { expedienteId: 1, fecha: '2026-02-01', estado: EstadoValoracion.VIGENTE, usoAyudasBiomecanicas: false, anulado: false, ...p });
  return { db, svc, barthel, tinetti, tf };
};

describe('ReporteSemestralService.construir', () => {
  it('Periodo I = enero–junio y II = julio–diciembre; los límites 30/06 y 01/07 caen donde corresponde', async () => {
    const { svc, barthel } = escenario();
    barthel({ fecha: '2026-06-30', puntajeTotal: 50, gradoDependencia: 'G-junio' });
    barthel({ expedienteId: 2, fecha: '2026-07-01', puntajeTotal: 60, gradoDependencia: 'G-julio' });
    const uno = await svc.construir(2026, 1, HOY);
    const dos = await svc.construir(2026, 2, HOY);
    expect(uno.periodo).toMatchObject({ romano: 'I', inicio: '2026-01-01', fin: '2026-06-30' });
    expect(dos.periodo).toMatchObject({ romano: 'II', inicio: '2026-07-01', fin: '2026-12-31' });
    expect(uno.evaluados.map((f) => f.expedienteId)).toEqual([1]);
    expect(dos.evaluados.map((f) => f.expedienteId)).toEqual([2]);
  });

  it('varias evaluaciones en el semestre: se toma la más reciente NO anulada, por instrumento; el grado es el ALMACENADO', async () => {
    const { svc, barthel, tinetti } = escenario();
    barthel({ fecha: '2026-02-01', puntajeTotal: 40, gradoDependencia: 'vieja' });
    barthel({ fecha: '2026-05-01', puntajeTotal: 100, gradoDependencia: 'Grado almacenado distinto del calculado' });
    barthel({ fecha: '2026-06-01', puntajeTotal: 10, gradoDependencia: 'anulada', anulado: true });
    tinetti({ fecha: '2026-04-01', puntajeTotal: 25 });
    tinetti({ fecha: '2026-04-01', puntajeTotal: 26 }); // mismo día: gana la registrada después
    const f = (await svc.construir(2026, 1, HOY)).evaluados[0];
    expect(f.barthel).toMatchObject({ puntaje: 100, grado: 'Grado almacenado distinto del calculado' });
    expect(f.tinetti?.total).toBe(26);
  });

  it('una evaluación solo anulada no cuenta: el residente va a «sin evaluación»', async () => {
    const { svc, barthel } = escenario();
    barthel({ expedienteId: 4, anulado: true });
    const r = await svc.construir(2026, 1, HOY);
    expect(r.evaluados).toHaveLength(0);
    expect(r.sinEvaluacion.map((x) => x.expedienteId)).toContain(4);
  });

  it('sin evaluación → sección aparte (solo activos); el inactivo con evaluación sí aparece, marcado', async () => {
    const { svc, barthel } = escenario([5, 3]);
    barthel({ expedienteId: 5 });
    const r = await svc.construir(2026, 1, HOY);
    expect(r.evaluados.map((f) => [f.expedienteId, f.inactivo])).toEqual([[5, true]]);
    expect(r.sinEvaluacion.map((x) => x.expedienteId).sort()).toEqual([1, 2, 4]); // 3 está inactivo y sin evaluación: no es pendiente
  });

  it('una sola lista ordenada por apellido y nombre (sin tildes ni mayúsculas)', async () => {
    const { svc, barthel } = escenario();
    for (const id of [1, 2, 3, 4]) barthel({ expedienteId: id });
    const r = await svc.construir(2026, 1, HOY);
    expect(r.evaluados.map((f) => f.nombre)).toEqual([
      'Alvarez Beta, Residente',
      'Álvarez Ficticio, Residente',
      'Pendiente Ficticio, Residente',
      'Zeta Ficticio, Residente',
    ]);
  });

  it('semestre anterior: comparación con diferencias; sin semestre anterior no hay comparación', async () => {
    const { svc, barthel, tinetti } = escenario();
    barthel({ fecha: '2025-11-10', puntajeTotal: 35, gradoDependencia: 'Dependencia Severa' });
    tinetti({ fecha: '2025-09-10', puntajeTotal: 15 });
    barthel({ fecha: '2026-03-10', puntajeTotal: 60, gradoDependencia: 'Dependencia Severa' });
    tinetti({ fecha: '2026-03-10', puntajeTotal: 20 });
    barthel({ expedienteId: 2, fecha: '2026-03-10' });
    const r = await svc.construir(2026, 1, HOY);
    expect(r.evaluados.find((f) => f.expedienteId === 1)?.comparacion).toEqual({
      barthel: { puntaje: 35, grado: 'Dependencia Severa', diferencia: 25 },
      tinetti: { total: 15, diferencia: 5 },
    });
    expect(r.evaluados.find((f) => f.expedienteId === 2)?.comparacion).toBeNull();
  });

  it('valoración vigente al cierre: la confirmada más reciente con fecha ≤ fin; el borrador y la posterior no cuentan', async () => {
    const { svc, barthel, tf } = escenario();
    barthel({});
    tf({ fecha: '2026-01-10', estado: EstadoValoracion.REEMPLAZADA, tratamiento: 'anterior', avances: 'a1' });
    tf({ fecha: '2026-05-20', estado: EstadoValoracion.VIGENTE, diagnosticoDiferencial: 'Dx', tratamiento: 'Tx', avances: 'Mejoró la marcha', usoAyudasBiomecanicas: true, detalleAyudasBiomecanicas: 'Andadera' });
    tf({ fecha: '2026-06-10', estado: EstadoValoracion.BORRADOR, tratamiento: 'borrador' });
    tf({ fecha: '2026-08-01', estado: EstadoValoracion.VIGENTE, tratamiento: 'posterior al cierre' });
    tf({ fecha: '2026-06-20', estado: EstadoValoracion.VIGENTE, tratamiento: 'anulada', anulado: true });
    const f = (await svc.construir(2026, 1, HOY)).evaluados[0];
    expect(f).toMatchObject({
      diagnosticoDiferencial: 'Dx',
      tratamiento: 'Tx',
      avances: { texto: 'Mejoró la marcha', fechaValoracion: '2026-05-20' },
      ayuda: { usa: true, cuales: 'Andadera' },
    });
  });

  it('avances vacío ⇒ texto null (el PDF pone «—»); sin valoración ⇒ avances y ayuda null', async () => {
    const { svc, barthel, tf } = escenario();
    barthel({});
    barthel({ expedienteId: 2 });
    tf({ avances: '   ' });
    const r = await svc.construir(2026, 1, HOY);
    expect(r.evaluados.find((f) => f.expedienteId === 1)?.avances).toEqual({ texto: null, fechaValoracion: '2026-02-01' });
    expect(r.evaluados.find((f) => f.expedienteId === 2)).toMatchObject({ avances: null, ayuda: null, tratamiento: null });
  });

  it('textos de más de 1500 caracteres: se avisa «texto completo en la valoración», nunca se corta en silencio', async () => {
    const { svc, barthel, tf } = escenario();
    barthel({});
    tf({ tratamiento: 'x'.repeat(1500), diagnosticoDiferencial: 'y'.repeat(1501) });
    const f = (await svc.construir(2026, 1, HOY)).evaluados[0];
    expect(f.tratamiento).toBe('x'.repeat(1500));
    expect(f.diagnosticoDiferencial).toMatch(/texto completo en la valoración\)$/);
    expect(f.diagnosticoDiferencial!.length).toBeLessThan(1501 + 60);
  });

  it('Test de Movimiento: la aplicación más reciente no anulada del periodo; no decide la inclusión', async () => {
    const { svc, db, barthel } = escenario();
    barthel({});
    db.insertar(EjercicioTestMovimiento, { id: 1, nombre: 'Levantarse', activo: true });
    db.insertar(EjercicioTestMovimiento, { id: 2, nombre: 'Caminar', activo: true });
    const vieja = db.insertar(AplicacionTestMovimiento, { expedienteId: 1, fecha: '2026-02-01' });
    const nueva = db.insertar(AplicacionTestMovimiento, { expedienteId: 1, fecha: '2026-05-01' });
    db.insertar(AplicacionTestMovimiento, { expedienteId: 1, fecha: '2026-06-01', anulado: true });
    db.insertar(AplicacionTestMovimiento, { expedienteId: 4, fecha: '2026-05-01' }); // solo test: no se incluye
    db.insertar(AplicacionTestMovimientoEjercicio, { aplicacionId: vieja.id, ejercicioId: 1, resultado: 'vieja' });
    db.insertar(AplicacionTestMovimientoEjercicio, { aplicacionId: nueva.id, ejercicioId: 2, resultado: 'Con apoyo' });
    db.insertar(AplicacionTestMovimientoEjercicio, { aplicacionId: nueva.id, ejercicioId: 1, resultado: 'Solo' });
    const r = await svc.construir(2026, 1, HOY);
    expect(r.evaluados.map((f) => f.expedienteId)).toEqual([1]);
    expect(r.evaluados[0].testMovimiento).toEqual({
      fecha: '2026-05-01',
      ejercicios: [
        { ejercicio: 'Levantarse', resultado: 'Solo' },
        { ejercicio: 'Caminar', resultado: 'Con apoyo' },
      ],
    });
    expect(r.sinEvaluacion.map((x) => x.expedienteId)).toContain(4);
  });

  it('edad a la fecha de corte con componentes UTC (frontera de cumpleaños)', async () => {
    const { svc, db, barthel } = escenario();
    barthel({});
    // nace el 30/06/1940 a medianoche UTC; el corte es 30/06/2026 ⇒ cumple 86 ese día.
    db.filas(Expediente_Residente)[0].residente.fecha_nacimiento = new Date('1940-06-30T00:00:00.000Z');
    expect((await svc.construir(2026, 1, HOY)).evaluados[0].edad).toBe(86);
    db.filas(Expediente_Residente)[0].residente.fecha_nacimiento = new Date('1940-07-01T00:00:00.000Z');
    expect((await svc.construir(2026, 1, HOY)).evaluados[0].edad).toBe(85);
  });

  it('periodo en curso: la edad se calcula a hoy, no al fin del semestre', async () => {
    const { svc, db, barthel } = escenario();
    barthel({ fecha: '2026-08-01' });
    db.filas(Expediente_Residente)[0].residente.fecha_nacimiento = new Date('1940-12-01T00:00:00.000Z');
    const r = await svc.construir(2026, 2, HOY); // hoy = 2026-11-02 ⇒ aún no cumple 86
    expect(r.fechaCorte).toBe(HOY);
    expect(r.evaluados[0].edad).toBe(85);
  });

  it('semestre que aún no comenzó ⇒ 400 «Datos inconsistentes»', async () => {
    const { svc } = escenario();
    await expect(svc.construir(2027, 1, HOY)).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.construir(2027, 1, HOY)).rejects.toMatchObject({ response: { message: 'Datos inconsistentes' } });
    await expect(svc.construir(2026, 2, '2026-06-30')).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.construir(2026, 2, '2026-07-01')).resolves.toBeDefined();
  });

  it('es de solo lectura: no escribe nada y no usa N+1 (una sola pasada de consultas por tabla)', async () => {
    const { svc, db, barthel } = escenario();
    for (const id of [1, 2, 3, 4]) barthel({ expedienteId: id });
    const antes = JSON.stringify(db.filas(EvaluacionBarthel));
    const llamadas: string[] = [];
    const original = db.dataSource.getRepository;
    db.dataSource.getRepository = (e: { name: string }) => {
      llamadas.push(e.name);
      return original(e);
    };
    await svc.construir(2026, 1, HOY);
    expect(JSON.stringify(db.filas(EvaluacionBarthel))).toBe(antes);
    expect(llamadas).toEqual(expect.arrayContaining(['Expediente_Residente', 'EvaluacionBarthel', 'EvaluacionTinetti', 'ValoracionFisioterapeutica', 'AplicacionTestMovimiento']));
    expect(llamadas.length).toBeLessThanOrEqual(6);
  });
});
