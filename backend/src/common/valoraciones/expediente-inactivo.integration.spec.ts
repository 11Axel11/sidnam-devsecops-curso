import 'reflect-metadata';
import { ConflictException } from '@nestjs/common';
import { DataSource, EntityTarget } from 'typeorm';
import { EstadoExpediente } from 'src/common/enums/estadosExpedientes.enum';
import { EstadoValoracion } from 'src/common/enums/estadoValoracion.enum';
import { maximoDeItem } from 'src/common/valoraciones/instrumento';
import {
  AntecedentePersonal,
  DatoFuncionalNutricion,
  EjercicioTestMovimiento,
  TipoAntecedenteTraumatico,
  TipoEventoImportante,
} from 'src/modulos/catalogos/entities/catalogos.entities';
import {
  ANTECEDENTES_PERSONALES,
  DATOS_FUNCIONALES_NUTRICION,
  EJERCICIOS_TEST_MOVIMIENTO,
  TIPOS_ANTECEDENTE_TRAUMATICO,
  TIPOS_EVENTO_IMPORTANTE,
} from 'src/modulos/catalogos/seed/catalogos-iniciales';
import { ControlesNutricionalesService } from 'src/modulos/nutricion/controles/controles-nutricionales.service';
import { ControlNutricional } from 'src/modulos/nutricion/entities/control-nutricional.entity';
import { EvaluacionMna } from 'src/modulos/nutricion/entities/evaluacion-mna.entity';
import { ValoracionNutricional } from 'src/modulos/nutricion/entities/valoracion-nutricional.entity';
import { EvaluacionesMnaService } from 'src/modulos/nutricion/mna/evaluaciones-mna.service';
import { ValoracionesNutricionalesService } from 'src/modulos/nutricion/valoraciones/valoraciones-nutricionales.service';
import { Expediente_Residente } from 'src/modulos/residentes/entities/expedientes.entity';
import { AntecedenteTraumatico } from 'src/modulos/terapia-fisica/entities/antecedente-traumatico.entity';
import { AplicacionTestMovimiento } from 'src/modulos/terapia-fisica/entities/aplicacion-test-movimiento.entity';
import { EvaluacionBarthel } from 'src/modulos/terapia-fisica/entities/evaluacion-barthel.entity';
import { EvaluacionTinetti } from 'src/modulos/terapia-fisica/entities/evaluacion-tinetti.entity';
import { EventoImportanteTf } from 'src/modulos/terapia-fisica/entities/evento-importante-tf.entity';
import { ValoracionFisioterapeutica } from 'src/modulos/terapia-fisica/entities/valoracion-fisioterapeutica.entity';
import { EvaluacionesBarthelService } from 'src/modulos/terapia-fisica/barthel/evaluaciones-barthel.service';
import { EventosImportantesService } from 'src/modulos/terapia-fisica/eventos-importantes/eventos-importantes.service';
import { AplicacionesTestMovimientoService } from 'src/modulos/terapia-fisica/test-movimiento/aplicaciones-test-movimiento.service';
import { EvaluacionesTinettiService } from 'src/modulos/terapia-fisica/tinetti/evaluaciones-tinetti.service';
import { ITEMS_TINETTI_V1, ItemsTinetti } from 'src/modulos/terapia-fisica/tinetti/tinetti-v1.instrumento';
import { AntecedentesValoracionService } from 'src/modulos/terapia-fisica/valoraciones/antecedentes-valoracion.service';
import { abrirDataSourceDeIntegracion, INTEGRACION_ACTIVA, nuevoExpediente, nuevoExpedienteConResidente } from 'src/modulos/terapia-fisica/valoraciones/testing/integracion';
import { esperarExpedienteInactivo } from 'src/modulos/terapia-fisica/valoraciones/testing/expediente-inactivo.util';
import { ValoracionesFisioterapeuticasService } from 'src/modulos/terapia-fisica/valoraciones/valoraciones-fisioterapeuticas.service';
import { CODIGO_EXPEDIENTE_INACTIVO } from './valoracion-lock.helper';

/**
 * INTEGRACIÓN con MySQL REAL (opt-in) de «expediente inactivo» (decisión de la Jefatura, octubre 2026): en un expediente
 * `Inactivo` real, TODA escritura de contenido clínico del Bloque B responde 409 `EXPEDIENTE_INACTIVO` sin dejar filas;
 * los GET y las anulaciones siguen funcionando; la vista previa del MNA se permite; y al reactivar vuelve a escribirse.
 *
 *   RUN_DB_INTEGRATION=1 DB_TEST_NAME=sidnam_scratch_b4 npx jest integration --runInBand
 */
const BARTHEL_MAX = { comer: 10, lavarse: 5, vestirse: 10, arreglarse: 5, deposiciones: 10, miccion: 10, usarRetrete: 10, trasladarse: 15, deambular: 15, escalones: 10 };
const TINETTI_MAX = Object.fromEntries(ITEMS_TINETTI_V1.map((i) => [i.campo, maximoDeItem(i)])) as ItemsTinetti;
const MNA_CUERPO = { itemA: 2, itemB: 3, itemC: 2, itemD: 2, itemE: 2, itemF: 3 };

(INTEGRACION_ACTIVA ? describe : describe.skip)('Expediente inactivo — integración MySQL (todo el Bloque B)', () => {
  jest.setTimeout(300_000);
  let ds: DataSource;
  let tf: ValoracionesFisioterapeuticasService;
  let antecedentes: AntecedentesValoracionService;
  let nutri: ValoracionesNutricionalesService;
  let eventos: EventosImportantesService;
  let testMov: AplicacionesTestMovimientoService;
  let controles: ControlesNutricionalesService;
  let barthel: EvaluacionesBarthelService;
  let tinetti: EvaluacionesTinettiService;
  let mna: EvaluacionesMnaService;
  let tipoEventoId: number;
  let tipoTraumaticoId: number;
  let datoFuncionalId: number;
  let ejercicios: EjercicioTestMovimiento[];

  beforeAll(async () => {
    ds = await abrirDataSourceDeIntegracion();
    tf = new ValoracionesFisioterapeuticasService(ds);
    antecedentes = new AntecedentesValoracionService(ds);
    nutri = new ValoracionesNutricionalesService(ds);
    eventos = new EventosImportantesService(ds);
    testMov = new AplicacionesTestMovimientoService(ds);
    controles = new ControlesNutricionalesService(ds);
    barthel = new EvaluacionesBarthelService(ds);
    tinetti = new EvaluacionesTinettiService(ds);
    mna = new EvaluacionesMnaService(ds);

    // Catálogos (en la app los siembra CatalogosSeedService al arrancar).
    const rE = ds.getRepository(TipoEventoImportante);
    if ((await rE.count()) === 0) await rE.save(TIPOS_EVENTO_IMPORTANTE.map((nombre) => rE.create({ nombre, activo: true })));
    await ds.createQueryBuilder().update(TipoEventoImportante).set({ activo: true }).execute();
    tipoEventoId = (await rE.findOneByOrFail({ nombre: 'Caída' })).id;

    const rT = ds.getRepository(TipoAntecedenteTraumatico);
    if ((await rT.count()) === 0) await rT.save(TIPOS_ANTECEDENTE_TRAUMATICO.map((nombre) => rT.create({ nombre, activo: true })));
    await ds.createQueryBuilder().update(TipoAntecedenteTraumatico).set({ activo: true }).execute();
    tipoTraumaticoId = (await rT.findOneByOrFail({ nombre: 'Fractura' })).id;

    const rD = ds.getRepository(DatoFuncionalNutricion);
    if ((await rD.count()) === 0) await rD.save(DATOS_FUNCIONALES_NUTRICION.map((nombre) => rD.create({ nombre, activo: true })));
    await ds.createQueryBuilder().update(DatoFuncionalNutricion).set({ activo: true }).execute();
    datoFuncionalId = (await rD.findOneByOrFail({ nombre: 'Deambula con ayuda' })).id;

    // Precondiciones: sin antecedentes personales activos (confirmar no los exige) y exactamente los tres ejercicios iniciales.
    const rA = ds.getRepository(AntecedentePersonal);
    if ((await rA.count()) === 0) await rA.save(ANTECEDENTES_PERSONALES.map((nombre) => rA.create({ nombre, activo: true })));
    await ds.createQueryBuilder().update(AntecedentePersonal).set({ activo: false }).execute();
    const rX = ds.getRepository(EjercicioTestMovimiento);
    if ((await rX.count()) === 0) await rX.save(EJERCICIOS_TEST_MOVIMIENTO.map((nombre) => rX.create({ nombre, activo: true })));
    for (const e of await rX.find()) {
      const debe = EJERCICIOS_TEST_MOVIMIENTO.includes(e.nombre);
      if (e.activo !== debe) await rX.update(e.id, { activo: debe });
    }
    ejercicios = await rX.find({ where: { activo: true }, order: { id: 'ASC' } });
  });

  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  const cerrar = (id: number) => ds.getRepository(Expediente_Residente).update({ id_expediente: id }, { estado: EstadoExpediente.Inactivo });
  const abrir = (id: number) => ds.getRepository(Expediente_Residente).update({ id_expediente: id }, { estado: EstadoExpediente.Activo });
  const conContar = (entidad: EntityTarget<{ expedienteId: number }>) => async (exp: number) =>
    ds.getRepository(entidad).count({ where: { expedienteId: exp } });
  const testMovCuerpo = () => ({ ejercicios: ejercicios.map((e) => ({ ejercicioId: e.id, modalidad: 'Con apoyo', resultado: 'Lo realiza' })) });

  it('el estado real del expediente se guarda como Activo por defecto y cambia a Inactivo (la fuente que lee el helper)', async () => {
    const exp = await nuevoExpediente(ds);
    expect((await ds.getRepository(Expediente_Residente).findOneByOrFail({ id_expediente: exp })).estado).toBe(EstadoExpediente.Activo);
    await cerrar(exp);
    expect((await ds.getRepository(Expediente_Residente).findOneByOrFail({ id_expediente: exp })).estado).toBe(EstadoExpediente.Inactivo);
  });

  describe('valoración fisioterapéutica', () => {
    it('crear, editar el borrador y confirmar ⇒ 409; anular y los GET funcionan; al reactivar se escribe', async () => {
      const exp = await nuevoExpediente(ds);
      const vigente = await tf.crear(exp, { tratamiento: 'Uno' }, 1);
      await tf.confirmar(vigente.id, 1);
      const borrador = await tf.crear(exp, { tratamiento: 'Dos' }, 1);
      await cerrar(exp);

      await esperarExpedienteInactivo(tf.crear(exp, {}, 1), exp);
      await esperarExpedienteInactivo(tf.actualizar(borrador.id, { tratamiento: 'Cambiado' }, 1), exp);
      await esperarExpedienteInactivo(tf.confirmar(borrador.id, 1), exp);
      expect(await conContar(ValoracionFisioterapeutica)(exp)).toBe(2);
      const intacta = await ds.getRepository(ValoracionFisioterapeutica).findOneByOrFail({ id: borrador.id });
      expect(intacta).toMatchObject({ tratamiento: 'Dos', estado: EstadoValoracion.BORRADOR });
      expect((await ds.getRepository(ValoracionFisioterapeutica).findOneByOrFail({ id: vigente.id })).estado).toBe(EstadoValoracion.VIGENTE);

      expect(await tf.listar(exp)).toHaveLength(2);
      expect((await tf.obtenerVigente(exp)).id).toBe(vigente.id);
      expect((await tf.obtenerDetalle(borrador.id)).id).toBe(borrador.id);
      await expect(tf.anular(borrador.id, 'Se descarta el borrador', 2)).resolves.toMatchObject({ anulado: true });

      await abrir(exp);
      await expect(tf.crear(exp, {}, 1)).resolves.toBeDefined();
    });

    it('antecedentes: upsert personal y traumático (crear/editar) ⇒ 409; anular el traumático sigue permitido', async () => {
      const exp = await nuevoExpediente(ds);
      const v = await tf.crear(exp, {}, 1);
      const t = await antecedentes.crearTraumatico(v.id, { tipoId: tipoTraumaticoId, localizacionAnatomica: 'Cadera' }, 1);
      await cerrar(exp);

      const item = (await ds.getRepository(AntecedentePersonal).find())[0];
      await esperarExpedienteInactivo(antecedentes.registrarPersonales(v.id, { antecedentes: [{ antecedenteId: item.id, presente: true }] }, 1), exp);
      await esperarExpedienteInactivo(antecedentes.crearTraumatico(v.id, { tipoId: tipoTraumaticoId }, 1), exp);
      await esperarExpedienteInactivo(antecedentes.actualizarTraumatico(t.id, { localizacionAnatomica: 'Rodilla' }, 1), exp);
      expect(await ds.getRepository(AntecedenteTraumatico).count({ where: { valoracionId: v.id } })).toBe(1);
      expect((await ds.getRepository(AntecedenteTraumatico).findOneByOrFail({ id: t.id })).localizacionAnatomica).toBe('Cadera');
      await expect(antecedentes.anularTraumatico(t.id, 'Registrado por error', 2)).resolves.toMatchObject({ anulado: true });

      await abrir(exp);
      await expect(antecedentes.crearTraumatico(v.id, { tipoId: tipoTraumaticoId }, 1)).resolves.toBeDefined();
    });
  });

  describe('valoración nutricional', () => {
    it('crear, editar el borrador y confirmar ⇒ 409; anular y los GET funcionan; al reactivar se escribe', async () => {
      const exp = await nuevoExpediente(ds);
      const vigente = await nutri.crear(exp, { datoFuncionalId }, 1);
      await nutri.confirmar(vigente.id, 1);
      const borrador = await nutri.crear(exp, { datoFuncionalId, problemaVisual: false }, 1);
      await cerrar(exp);

      await esperarExpedienteInactivo(nutri.crear(exp, { datoFuncionalId }, 1), exp);
      await esperarExpedienteInactivo(nutri.actualizar(borrador.id, { problemaVisual: true }, 1), exp);
      await esperarExpedienteInactivo(nutri.confirmar(borrador.id, 1), exp);
      expect(await conContar(ValoracionNutricional)(exp)).toBe(2);
      expect(await ds.getRepository(ValoracionNutricional).findOneByOrFail({ id: borrador.id })).toMatchObject({ problemaVisual: false, estado: EstadoValoracion.BORRADOR });

      expect(await nutri.listar(exp)).toHaveLength(2);
      expect((await nutri.obtenerVigente(exp)).id).toBe(vigente.id);
      expect((await nutri.obtenerDetalle(vigente.id)).id).toBe(vigente.id);
      await expect(nutri.anular(borrador.id, 'Se descarta', 2)).resolves.toMatchObject({ anulado: true });

      await abrir(exp);
      await expect(nutri.crear(exp, { datoFuncionalId }, 1)).resolves.toBeDefined();
    });
  });

  describe('registros anclados al expediente', () => {
    it('evento importante: crear ⇒ 409; el listado y anular funcionan', async () => {
      const exp = await nuevoExpediente(ds);
      const e = await eventos.crear(exp, { tipoEventoId }, 1);
      await cerrar(exp);
      await esperarExpedienteInactivo(eventos.crear(exp, { tipoEventoId }, 1), exp);
      expect(await conContar(EventoImportanteTf)(exp)).toBe(1);
      expect(await eventos.listar(exp, {})).toHaveLength(1);
      await expect(eventos.anular(e.id, 'Duplicado', 2)).resolves.toMatchObject({ anulado: true });
      await abrir(exp);
      await expect(eventos.crear(exp, { tipoEventoId }, 1)).resolves.toBeDefined();
    });

    it('test de movimiento: crear ⇒ 409 (sin cabecera ni detalle); el listado y anular funcionan', async () => {
      const exp = await nuevoExpediente(ds);
      const a = await testMov.crear(exp, testMovCuerpo(), 1);
      await cerrar(exp);
      await esperarExpedienteInactivo(testMov.crear(exp, testMovCuerpo(), 1), exp);
      expect(await conContar(AplicacionTestMovimiento)(exp)).toBe(1);
      expect(await testMov.listar(exp, {})).toHaveLength(1);
      await expect(testMov.anular(a.id, 'Error', 2)).resolves.toMatchObject({ anulado: true });
      await abrir(exp);
      await expect(testMov.crear(exp, testMovCuerpo(), 1)).resolves.toBeDefined();
    });

    it('control nutricional: crear ⇒ 409; la serie y anular funcionan', async () => {
      const exp = await nuevoExpedienteConResidente(ds, new Date('1940-05-12'));
      const c = await controles.crear(exp, { peso: 58.4, talla: 152 }, 1);
      await cerrar(exp);
      await esperarExpedienteInactivo(controles.crear(exp, { peso: 60, talla: 152 }, 1), exp);
      expect(await conContar(ControlNutricional)(exp)).toBe(1);
      expect(await controles.listar(exp, {})).toHaveLength(1);
      await expect(controles.anular(c.id, 'Peso mal digitado', 2)).resolves.toMatchObject({ anulado: true, imc: 25.3 });
      await abrir(exp);
      await expect(controles.crear(exp, { peso: 60, talla: 152 }, 1)).resolves.toBeDefined();
    });

    it('Barthel: crear ⇒ 409; el listado y anular funcionan', async () => {
      const exp = await nuevoExpediente(ds);
      const e = await barthel.crear(exp, BARTHEL_MAX, 1);
      await cerrar(exp);
      await esperarExpedienteInactivo(barthel.crear(exp, BARTHEL_MAX, 1), exp);
      expect(await conContar(EvaluacionBarthel)(exp)).toBe(1);
      expect(await barthel.listar(exp, {})).toHaveLength(1);
      await expect(barthel.anular(e.id, 'Error', 2)).resolves.toMatchObject({ anulado: true });
      await abrir(exp);
      await expect(barthel.crear(exp, BARTHEL_MAX, 1)).resolves.toBeDefined();
    });

    it('Tinetti: crear ⇒ 409 SIN consumir número de control; el listado y anular funcionan', async () => {
      const exp = await nuevoExpedienteConResidente(ds, new Date('1940-05-12'));
      const e = await tinetti.crear(exp, { ...TINETTI_MAX }, 1);
      expect(e.numeroControl).toBe(1);
      await cerrar(exp);
      await esperarExpedienteInactivo(tinetti.crear(exp, { ...TINETTI_MAX }, 1), exp);
      await esperarExpedienteInactivo(tinetti.crear(exp, { ...TINETTI_MAX }, 1), exp);
      expect(await conContar(EvaluacionTinetti)(exp)).toBe(1);
      expect(await tinetti.listar(exp, {})).toHaveLength(1);
      await expect(tinetti.anular(e.id, 'Error', 2)).resolves.toMatchObject({ anulado: true });
      await abrir(exp);
      await expect(tinetti.crear(exp, { ...TINETTI_MAX }, 1)).resolves.toMatchObject({ numeroControl: 2 }); // el 1 sigue siendo de la anulada
    });

    it('MNA: crear ⇒ 409; la VISTA PREVIA se permite (no persiste); el listado y anular funcionan', async () => {
      const exp = await nuevoExpedienteConResidente(ds, new Date('1940-05-12'));
      const e = await mna.crear(exp, MNA_CUERPO as never, 1);
      await cerrar(exp);
      await esperarExpedienteInactivo(mna.crear(exp, MNA_CUERPO as never, 1), exp);
      await expect(mna.calcular(exp, MNA_CUERPO as never)).resolves.toMatchObject({ subtotalCribaje: 14 });
      expect(await conContar(EvaluacionMna)(exp)).toBe(1);
      expect(await mna.listar(exp, {})).toHaveLength(1);
      await expect(mna.anular(e.id, 'Error', 2)).resolves.toMatchObject({ anulado: true });
      await abrir(exp);
      await expect(mna.crear(exp, MNA_CUERPO as never, 1)).resolves.toBeDefined();
    });
  });

  it('el 409 real trae el cuerpo estable (statusCode, error, codigo, expedienteId, message)', async () => {
    const exp = await nuevoExpediente(ds);
    await cerrar(exp);
    const e = await barthel.crear(exp, BARTHEL_MAX, 1).then(
      () => undefined,
      (x: unknown) => x as ConflictException,
    );
    expect(e).toBeInstanceOf(ConflictException);
    expect(e!.getStatus()).toBe(409);
    expect(e!.getResponse()).toEqual({
      statusCode: 409,
      error: 'Conflict',
      codigo: CODIGO_EXPEDIENTE_INACTIVO,
      message: `El expediente ${exp} está inactivo: no se pueden registrar ni modificar datos clínicos (las consultas y las anulaciones siguen disponibles). Reactive el expediente para continuar.`,
      expedienteId: exp,
    });
  });

  it('cerrar un expediente no afecta a otro: el expediente activo sigue escribiendo', async () => {
    const cerrado = await nuevoExpediente(ds);
    const activo = await nuevoExpediente(ds);
    await cerrar(cerrado);
    await expect(barthel.crear(activo, BARTHEL_MAX, 1)).resolves.toBeDefined();
    await esperarExpedienteInactivo(barthel.crear(cerrado, BARTHEL_MAX, 1), cerrado);
  });
});
