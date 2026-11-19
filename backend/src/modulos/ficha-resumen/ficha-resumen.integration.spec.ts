/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- respuesta JSON sin tipar */
import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EstadoExpediente } from 'src/common/enums/estadosExpedientes.enum';
import { AntecedentePersonal, DatoFuncionalNutricion, TipoEventoImportante } from 'src/modulos/catalogos/entities/catalogos.entities';
import { DATOS_FUNCIONALES_NUTRICION, TIPOS_EVENTO_IMPORTANTE } from 'src/modulos/catalogos/seed/catalogos-iniciales';
import { ValoracionesNutricionalesService } from 'src/modulos/nutricion/valoraciones/valoraciones-nutricionales.service';
import { Expediente_Residente } from 'src/modulos/residentes/entities/expedientes.entity';
import { EvaluacionesBarthelService } from 'src/modulos/terapia-fisica/barthel/evaluaciones-barthel.service';
import { EventosImportantesService } from 'src/modulos/terapia-fisica/eventos-importantes/eventos-importantes.service';
import { abrirDataSourceDeIntegracion, INTEGRACION_ACTIVA, nuevoExpediente } from 'src/modulos/terapia-fisica/valoraciones/testing/integracion';
import { ValoracionesFisioterapeuticasService } from 'src/modulos/terapia-fisica/valoraciones/valoraciones-fisioterapeuticas.service';
import { FichaResumenService } from './ficha-resumen.service';

/**
 * INTEGRACIÓN con MySQL REAL (opt-in) de la ficha resumen: los datos salen de los servicios reales de Barthel, valoración
 * nutricional, valoración fisioterapéutica y eventos; el tipo «Caída» sembrado se reconoce; sin datos no hay error.
 *
 *   RUN_DB_INTEGRATION=1 DB_TEST_NAME=sidnam_scratch_b4 npx jest integration --runInBand
 */
const BARTHEL = { comer: 10, lavarse: 5, vestirse: 10, arreglarse: 5, deposiciones: 10, miccion: 10, usarRetrete: 10, trasladarse: 15, deambular: 15, escalones: 10 };

(INTEGRACION_ACTIVA ? describe : describe.skip)('Ficha resumen — integración MySQL (RF-TR-01)', () => {
  jest.setTimeout(240_000);
  let ds: DataSource;
  let ficha: FichaResumenService;
  let barthel: EvaluacionesBarthelService;
  let nutri: ValoracionesNutricionalesService;
  let tf: ValoracionesFisioterapeuticasService;
  let eventos: EventosImportantesService;
  let conAyuda: number;
  let caida: number;
  let hospitalizacion: number;

  beforeAll(async () => {
    ds = await abrirDataSourceDeIntegracion();
    ficha = new FichaResumenService(ds);
    barthel = new EvaluacionesBarthelService(ds);
    nutri = new ValoracionesNutricionalesService(ds);
    tf = new ValoracionesFisioterapeuticasService(ds);
    eventos = new EventosImportantesService(ds);
    const rE = ds.getRepository(TipoEventoImportante);
    if ((await rE.count()) === 0) await rE.save(TIPOS_EVENTO_IMPORTANTE.map((nombre) => rE.create({ nombre, activo: true })));
    await ds.createQueryBuilder().update(TipoEventoImportante).set({ activo: true }).execute();
    caida = (await rE.findOneByOrFail({ nombre: 'Caída' })).id; // el seed lo trae
    hospitalizacion = (await rE.findOneByOrFail({ nombre: 'Hospitalización' })).id;
    const rD = ds.getRepository(DatoFuncionalNutricion);
    if ((await rD.count()) === 0) await rD.save(DATOS_FUNCIONALES_NUTRICION.map((nombre) => rD.create({ nombre, activo: true })));
    await ds.createQueryBuilder().update(DatoFuncionalNutricion).set({ activo: true }).execute();
    conAyuda = (await rD.findOneByOrFail({ nombre: 'Deambula con ayuda' })).id;
    await ds.createQueryBuilder().update(AntecedentePersonal).set({ activo: false }).execute(); // confirmar TF no exige antecedentes
  });

  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  it('con datos de los cuatro orígenes reales: cada bloque trae lo suyo', async () => {
    const exp = await nuevoExpediente(ds);
    await barthel.crear(exp, { ...BARTHEL, fecha: '2026-08-01' }, 1);
    await barthel.crear(exp, { ...BARTHEL, deambular: 0, escalones: 0, fecha: '2026-10-05' }, 1);
    const v = await nutri.crear(exp, { datoFuncionalId: conAyuda, alergiaMedicamentos: true, detalleAlergiaMedicamentos: 'Penicilina', fecha: '2026-10-03' }, 1);
    await nutri.confirmar(v.id, 1);
    const t = await tf.crear(exp, { antecedentesCaidas: true, detalleCaidas: 'Caída en el baño', usoAyudasBiomecanicas: true, detalleAyudasBiomecanicas: 'Bastón', fecha: '2026-10-04', tratamiento: 'NO DEBE SALIR' }, 1);
    await tf.confirmar(t.id, 1);
    await eventos.crear(exp, { tipoEventoId: caida, fechaHora: '2026-06-01T10:00:00' }, 1);
    await eventos.crear(exp, { tipoEventoId: caida, fechaHora: '2026-09-01T10:00:00' }, 1);
    await eventos.crear(exp, { tipoEventoId: hospitalizacion, fechaHora: '2026-10-01T10:00:00' }, 1);

    const f = JSON.parse(JSON.stringify(await ficha.obtener(exp)));
    expect(f.expedienteId).toBe(exp);
    expect(f.dependenciaBarthel).toEqual({ datos: { grado: 'Dependencia Moderada', fecha: '2026-10-05' }, motivo: null });
    expect(f.condicionMovilidad.datos).toEqual({ condicion: 'Deambula con ayuda' });
    expect(f.alergiaMedicamentos.datos).toEqual({ presenta: true, cuales: 'Penicilina' });
    expect(f.ayudasBiomecanicas.datos).toEqual({ usa: true, cuales: 'Bastón' });
    expect(f.antecedentesCaidas.datos).toEqual({ presenta: true });
    expect(f.ultimoEventoCaida.datos.fechaHora).toBe('2026-09-01T16:00:00.000Z'); // 10:00 de Costa Rica = 16:00Z
    expect(f.ultimaValoracionTerapiaFisica.datos).toEqual({ fecha: '2026-10-04', estado: 'vigente' });
    expect(f.ultimaValoracionNutricion.datos).toEqual({ fecha: '2026-10-03', estado: 'vigente' });
    expect(JSON.stringify(f)).not.toContain('NO DEBE SALIR');
  });

  it('expediente sin datos: 200 con todos los bloques en null y su motivo', async () => {
    const exp = await nuevoExpediente(ds);
    const f = await ficha.obtener(exp);
    for (const [k, b] of Object.entries(f)) {
      if (k === 'expedienteId') continue;
      expect(b).toEqual({ datos: null, motivo: expect.any(String) });
    }
  });

  it('solo un borrador de cada departamento ⇒ «Hay una valoración en elaboración…», sin fecha ni estado', async () => {
    const exp = await nuevoExpediente(ds);
    await nutri.crear(exp, { datoFuncionalId: conAyuda, fecha: '2026-10-09' }, 1);
    await tf.crear(exp, { fecha: '2026-10-08' }, 1);
    const f = await ficha.obtener(exp);
    expect(f.ultimaValoracionNutricion).toEqual({ datos: null, motivo: 'Hay una valoración en elaboración, aún sin confirmar' });
    expect(f.ultimaValoracionTerapiaFisica).toEqual({ datos: null, motivo: 'Hay una valoración en elaboración, aún sin confirmar' });
    expect(f.condicionMovilidad.datos).toBeNull();
  });

  it('sin vigente por anulación: la más reciente reemplazada no anulada', async () => {
    const exp = await nuevoExpediente(ds);
    const a = await nutri.crear(exp, { datoFuncionalId: conAyuda, fecha: '2026-05-01' }, 1);
    await nutri.confirmar(a.id, 1);
    const b = await nutri.crear(exp, { datoFuncionalId: conAyuda, fecha: '2026-07-01' }, 1);
    await nutri.confirmar(b.id, 1); // a pasa a reemplazada
    await nutri.anular(b.id, 'Error', 1); // el expediente queda sin vigente
    expect((await ficha.obtener(exp)).ultimaValoracionNutricion.datos).toEqual({ fecha: '2026-05-01', estado: 'reemplazada' });
  });

  it('un expediente INACTIVO se consulta igual; uno inexistente es 404', async () => {
    const exp = await nuevoExpediente(ds);
    await barthel.crear(exp, BARTHEL, 1);
    await ds.getRepository(Expediente_Residente).update({ id_expediente: exp }, { estado: EstadoExpediente.Inactivo });
    expect((await ficha.obtener(exp)).dependenciaBarthel.datos?.grado).toBe('Independencia');
    await expect(ficha.obtener(999_999_999)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('el tipo «Caída» desactivado después sigue contando; la ficha no escribe nada', async () => {
    const exp = await nuevoExpediente(ds);
    await eventos.crear(exp, { tipoEventoId: caida, fechaHora: '2026-09-01T10:00:00' }, 1);
    await ds.getRepository(TipoEventoImportante).update(caida, { activo: false });
    try {
      expect((await ficha.obtener(exp)).ultimoEventoCaida.datos).not.toBeNull();
    } finally {
      await ds.getRepository(TipoEventoImportante).update(caida, { activo: true });
    }
  });
});
