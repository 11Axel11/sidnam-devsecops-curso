import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { maximoDeItem } from 'src/common/valoraciones/instrumento';
import { AntecedentePersonal } from 'src/modulos/catalogos/entities/catalogos.entities';
import { Expediente_Residente } from 'src/modulos/residentes/entities/expedientes.entity';
import { Residente } from 'src/modulos/residentes/entities/residente.entity';
import { EvaluacionesBarthelService } from '../barthel/evaluaciones-barthel.service';
import { EvaluacionesTinettiService } from '../tinetti/evaluaciones-tinetti.service';
import { ITEMS_TINETTI_V1, ItemsTinetti } from '../tinetti/tinetti-v1.instrumento';
import { abrirDataSourceDeIntegracion, INTEGRACION_ACTIVA, nuevoExpedienteConResidente } from '../valoraciones/testing/integracion';
import { ValoracionesFisioterapeuticasService } from '../valoraciones/valoraciones-fisioterapeuticas.service';
import { ReporteSemestralService } from './reporte-semestral.service';

/**
 * INTEGRACIÓN con MySQL REAL (opt-in) del reporte semestral: los datos los crean los servicios reales de Barthel, Tinetti y
 * valoración fisioterapéutica (con datos FICTICIOS) y el reporte los lee con las consultas reales (decimales, fechas, UTC).
 *
 *   RUN_DB_INTEGRATION=1 DB_TEST_NAME=sidnam_scratch_b4 npx jest integration --runInBand
 */
const BARTHEL = { comer: 10, lavarse: 5, vestirse: 10, arreglarse: 5, deposiciones: 10, miccion: 10, usarRetrete: 10, trasladarse: 15, deambular: 15, escalones: 10 };
const MAXIMO = Object.fromEntries(ITEMS_TINETTI_V1.map((i) => [i.campo, maximoDeItem(i)])) as ItemsTinetti;

(INTEGRACION_ACTIVA ? describe : describe.skip)('Reporte semestral TF — integración MySQL (RF-TF-12)', () => {
  jest.setTimeout(240_000);
  let ds: DataSource;
  let svc: ReporteSemestralService;
  let barthel: EvaluacionesBarthelService;
  let tinetti: EvaluacionesTinettiService;
  let tf: ValoracionesFisioterapeuticasService;

  beforeAll(async () => {
    ds = await abrirDataSourceDeIntegracion();
    svc = new ReporteSemestralService(ds, {} as never);
    barthel = new EvaluacionesBarthelService(ds);
    tinetti = new EvaluacionesTinettiService(ds);
    tf = new ValoracionesFisioterapeuticasService(ds);
    await ds.createQueryBuilder().update(AntecedentePersonal).set({ activo: false }).execute(); // confirmar TF no exige antecedentes
  });

  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  const nombrar = async (expedienteId: number, nombre: string, apellido1: string) => {
    const e = await ds.getRepository(Expediente_Residente).findOneOrFail({ where: { id_expediente: expedienteId }, relations: { residente: true } });
    const id = e.residente.id_adulto_mayor;
    await ds.getRepository(Residente).update({ id_adulto_mayor: id }, { nombre, apellido1, apellido2: 'Ficticio' });
  };

  it('genera el reporte con datos reales: la más reciente del periodo, almacenado, comparación, vigente al cierre, sin evaluación', async () => {
    const apellido = `Zz${Date.now()}`;
    const conDatos = await nuevoExpedienteConResidente(ds, new Date('1940-06-30'));
    const sinDatos = await nuevoExpedienteConResidente(ds, new Date('1940-06-30'));
    await nombrar(conDatos, 'Residente Uno', apellido);
    await nombrar(sinDatos, 'Residente Dos', apellido);

    await barthel.crear(conDatos, { ...BARTHEL, fecha: '2025-11-10' }, 1); // semestre anterior: 100
    await barthel.crear(conDatos, { ...BARTHEL, deambular: 0, escalones: 0, fecha: '2026-02-10' }, 1);
    const b2 = await barthel.crear(conDatos, { ...BARTHEL, fecha: '2026-05-10' }, 1); // la más reciente del periodo
    const anulada = await barthel.crear(conDatos, { ...BARTHEL, comer: 0, fecha: '2026-06-01' }, 1);
    await barthel.anular(anulada.id, 'Error de digitación', 1);
    const t = await tinetti.crear(conDatos, { ...MAXIMO, fecha: '2026-04-01' }, 1);

    const v1 = await tf.crear(conDatos, { fecha: '2026-03-01', diagnosticoDiferencial: 'Dx ficticio', tratamiento: 'Tx ficticio', avances: 'Avance ficticio ' + 'x'.repeat(2500), usoAyudasBiomecanicas: true, detalleAyudasBiomecanicas: 'Andadera' }, 1);
    await tf.confirmar(v1.id, 1);
    const v2 = await tf.crear(conDatos, { fecha: '2026-09-01', tratamiento: 'Posterior al cierre' }, 1);
    await tf.confirmar(v2.id, 1);

    const r = await svc.construir(2026, 1, '2026-11-02');
    const fila = r.evaluados.find((f) => f.expedienteId === conDatos)!;
    expect(fila).toBeDefined();
    expect(fila.nombre).toBe(`${apellido} Ficticio, Residente Uno`);
    expect(fila.barthel).toMatchObject({ puntaje: b2.puntajeTotal, grado: b2.gradoDependencia, fecha: '2026-05-10' });
    expect(fila.tinetti).toMatchObject({ total: t.puntajeTotal, equilibrio: t.puntajeEquilibrio, marcha: t.puntajeMarcha });
    expect(fila.comparacion?.barthel).toMatchObject({ puntaje: 100, diferencia: b2.puntajeTotal - 100 });
    expect(fila.tratamiento).toBe('Tx ficticio'); // la valoración de septiembre no es «vigente al cierre»
    expect(fila.ayuda).toEqual({ usa: true, cuales: 'Andadera' });
    expect(fila.avances?.fechaValoracion).toBe('2026-03-01');
    expect(fila.avances?.texto).toMatch(/texto completo en la valoración\)$/); // >1500: avisa, no corta en silencio
    expect(fila.edad).toBe(86); // cumple 86 el 30/06/2026, día del cierre (componentes UTC)
    expect(r.sinEvaluacion.map((x) => x.expedienteId)).toContain(sinDatos);
    expect(r.evaluados.map((f) => f.expedienteId)).not.toContain(sinDatos);
  });

  it('el periodo II no ve lo del I y viceversa; semestre futuro ⇒ 400', async () => {
    const exp = await nuevoExpedienteConResidente(ds, new Date('1940-06-30'));
    await barthel.crear(exp, { ...BARTHEL, fecha: '2026-08-15' }, 1);
    expect((await svc.construir(2026, 2, '2026-11-02')).evaluados.map((f) => f.expedienteId)).toContain(exp);
    expect((await svc.construir(2026, 1, '2026-11-02')).evaluados.map((f) => f.expedienteId)).not.toContain(exp);
    await expect(svc.construir(2027, 1, '2026-11-02')).rejects.toMatchObject({ response: { message: 'Datos inconsistentes' } });
  });

  it('es de solo lectura: ninguna tabla cambia al generar el reporte', async () => {
    const contar = async (): Promise<Record<string, unknown>> => {
      const filas: Record<string, unknown>[] = await ds.query('SELECT (SELECT COUNT(*) FROM evaluacion_barthel) a, (SELECT COUNT(*) FROM evaluacion_tinetti) b, (SELECT COUNT(*) FROM valoracion_fisioterapeutica) c');
      return filas[0];
    };
    const antes = await contar();
    await svc.construir(2026, 1, '2026-11-02');
    expect(await contar()).toEqual(antes);
  });
});
