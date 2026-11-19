/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return -- base simulada en memoria */
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { generarTextoLargo } from 'src/common/testing/texto-largo.helper';
import { crearDbSimulada } from 'src/modulos/terapia-fisica/valoraciones/testing/db-simulada';
import { ControlNutricional } from '../entities/control-nutricional.entity';
import { ControlesNutricionalesService } from './controles-nutricionales.service';

/**
 * Servicio del control nutricional contra la base simulada. Expedientes: 1 (residente nacido 1940-05-12),
 * 2 (nacido 1935-11-27, leído como lo devuelve el driver: medianoche UTC), 3 (sin residente).
 * «Hoy» se fija en 2026-10-21 18:00 (hora de Costa Rica = 2026-10-22T00:00Z, para comprobar que el día
 * por defecto es el de Costa Rica y no el de UTC).
 */
const HOY = '2026-10-21';
const AHORA = new Date('2026-10-22T00:00:00.000Z');
const USUARIO = 9;

const escenario = () => {
  const db = crearDbSimulada([1, 2, 3], { 2: new Date('1935-11-27T00:00:00.000Z'), 3: null });
  const svc = new ControlesNutricionalesService(db.dataSource);
  const controles = () => db.filas(ControlNutricional) as ControlNutricional[];
  const control = (parcial: Partial<ControlNutricional> & { fecha: string }) =>
    db.insertar(ControlNutricional, {
      expedienteId: 1,
      edadMomentoControl: 86,
      peso: 60,
      talla: 152,
      imc: 26,
      anulado: false,
      ...parcial,
    });
  return { db, svc, controles, control };
};

const datos = { peso: 58.4, talla: 152 };

/** Los `errores` del 400 `{ message: 'Datos inconsistentes', errores }`. */
const erroresDe = async (promesa: Promise<unknown>): Promise<string[]> => {
  const e = await promesa.then(
    () => {
      throw new Error('se esperaba un 400');
    },
    (x: unknown) => x,
  );
  expect(e).toBeInstanceOf(BadRequestException);
  return (e as BadRequestException).getResponse()['errores'];
};

describe('ControlesNutricionalesService', () => {
  beforeEach(() => {
    // Solo se congela el reloj (Date); promesas y temporizadores siguen reales.
    jest.useFakeTimers({
      now: AHORA,
      doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate', 'clearImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'hrtime', 'performance'],
    });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('crear', () => {
    it('CA-14: 58,4 kg y 152 cm ⇒ IMC 25,3 y la edad del residente, sin digitar ninguno', async () => {
      const { svc } = escenario();
      const c = await svc.crear(1, { ...datos, fecha: HOY }, USUARIO);
      expect(c).toMatchObject({ expedienteId: 1, fecha: HOY, peso: 58.4, talla: 152, imc: 25.3, edadMomentoControl: 86 });
    });

    it('la fecha por defecto es HOY en Costa Rica (no el día UTC, que ya es el siguiente)', async () => {
      const { svc } = escenario();
      expect((await svc.crear(1, datos, USUARIO)).fecha).toBe(HOY); // UTC ya marca 2026-10-22
    });

    it('la edad se calcula a la FECHA DEL CONTROL, no a hoy', async () => {
      const { svc } = escenario();
      // nacido 1940-05-12: un día antes del cumpleaños 85 y el día del cumpleaños
      expect((await svc.crear(1, { ...datos, fecha: '2025-05-11' }, USUARIO)).edadMomentoControl).toBe(84);
      expect((await svc.crear(1, { ...datos, fecha: '2025-05-12' }, USUARIO)).edadMomentoControl).toBe(85);
      expect((await svc.crear(1, { ...datos, fecha: HOY }, USUARIO)).edadMomentoControl).toBe(86);
    });

    it('fecha de nacimiento guardada como la guarda la app (medianoche UTC leída con -06:00) y cumpleaños en la frontera', async () => {
      const { svc } = escenario();
      // expediente 2: fila guardada «1935-11-26 18:00:00», leída 1935-11-27T00:00:00Z ⇒ nació el 27 de noviembre
      expect((await svc.crear(2, { ...datos, fecha: '2025-11-26' }, USUARIO)).edadMomentoControl).toBe(89); // víspera
      expect((await svc.crear(2, { ...datos, fecha: '2025-11-27' }, USUARIO)).edadMomentoControl).toBe(90); // el día
      expect((await svc.crear(2, { ...datos, fecha: '2025-11-28' }, USUARIO)).edadMomentoControl).toBe(90);
    });

    it('un control a la fecha de nacimiento da edad 0 y uno anterior se rechaza', async () => {
      const { svc, controles } = escenario();
      expect((await svc.crear(2, { ...datos, fecha: '1935-11-27' }, USUARIO)).edadMomentoControl).toBe(0);
      expect(await erroresDe(svc.crear(2, { ...datos, fecha: '1935-11-26' }, USUARIO))).toEqual([
        'La fecha del control no puede ser anterior a la fecha de nacimiento del residente',
      ]);
      expect(controles()).toHaveLength(1);
    });

    it('los valores calculados nunca se aceptan del cliente: aunque lleguen en el objeto, se ignoran', async () => {
      const { svc } = escenario();
      const malicioso = { ...datos, fecha: HOY, imc: 99, edadMomentoControl: 1, anulado: true, expedienteId: 3, creadoPorId: 500 };
      const c = await svc.crear(1, malicioso as any, USUARIO);
      expect(c).toMatchObject({ expedienteId: 1, imc: 25.3, edadMomentoControl: 86, anulado: false, creadoPorId: USUARIO });
    });

    it('registra el autor desde el token y deja los opcionales en null', async () => {
      const { svc } = escenario();
      const c = await svc.crear(1, datos, USUARIO);
      expect(c.creadoPorId).toBe(USUARIO);
      expect(c).toMatchObject({
        circunferenciaBraquial: null,
        circunferenciaPantorrilla: null,
        alturaRodilla: null,
        fuerzaMuscular: null,
        interpretacion: null,
      });
    });

    it('guarda todas las medidas y la interpretación (texto largo sin fragmentar)', async () => {
      const { svc } = escenario();
      const largo = generarTextoLargo(5000);
      const c = await svc.crear(
        1,
        {
          ...datos,
          circunferenciaBraquial: 27.5,
          circunferenciaPantorrilla: 32,
          alturaRodilla: 47.5,
          fuerzaMuscular: 18.5,
          interpretacion: largo,
        },
        USUARIO,
      );
      expect(c).toMatchObject({ circunferenciaBraquial: 27.5, circunferenciaPantorrilla: 32, alturaRodilla: 47.5, fuerzaMuscular: 18.5 });
      expect(c.interpretacion).toBe(largo);
    });

    it('expediente inexistente ⇒ 404 y no se crea nada (RN-01)', async () => {
      const { svc, controles } = escenario();
      await expect(svc.crear(99, datos, USUARIO)).rejects.toBeInstanceOf(NotFoundException);
      expect(controles()).toHaveLength(0);
    });

    it('expediente sin residente ⇒ 409: no se inventa la edad', async () => {
      const { svc, controles } = escenario();
      await expect(svc.crear(3, datos, USUARIO)).rejects.toBeInstanceOf(ConflictException);
      expect(controles()).toHaveLength(0);
    });

    it('fecha futura ⇒ 400 con errores', async () => {
      const { svc, controles } = escenario();
      const e = (await svc.crear(1, { ...datos, fecha: '2026-10-22' }, USUARIO).catch((x: unknown) => x)) as BadRequestException;
      expect(e).toBeInstanceOf(BadRequestException);
      expect(e.getResponse()).toEqual({
        message: 'Datos inconsistentes',
        errores: ['La fecha del control no puede ser posterior a hoy'],
      });
      expect(controles()).toHaveLength(0);
    });

    it('fecha inexistente ⇒ 400', async () => {
      const { svc } = escenario();
      expect(await erroresDe(svc.crear(1, { ...datos, fecha: '2026-02-30' }, USUARIO))).toEqual([
        'La fecha del control no es una fecha válida (formato YYYY-MM-DD)',
      ]);
    });

    it('un residente puede tener muchos controles, incluso del mismo día: ninguno sobrescribe al otro (RN-02)', async () => {
      const { svc, controles } = escenario();
      await svc.crear(1, { ...datos, fecha: HOY }, USUARIO);
      await svc.crear(1, { peso: 57, talla: 152, fecha: HOY }, USUARIO);
      await svc.crear(1, { peso: 56, talla: 152, fecha: '2026-07-21' }, USUARIO);
      expect(controles().map((c) => c.peso)).toEqual([58.4, 57, 56]);
    });
  });

  describe('listar', () => {
    it('expediente inexistente ⇒ 404', async () => {
      const { svc } = escenario();
      await expect(svc.listar(99, {})).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rango inválido ⇒ 400 con errores', async () => {
      const { svc } = escenario();
      await expect(svc.listar(1, { desde: '2026-10-22', hasta: '2026-10-21' })).rejects.toThrow(BadRequestException);
      const e = (await svc.listar(1, { desde: '2026-02-30' }).catch((x: unknown) => x)) as BadRequestException;
      expect(e.getResponse()).toEqual({
        message: 'Datos inconsistentes',
        errores: ['desde no es una fecha válida (formato YYYY-MM-DD)'],
      });
    });

    it('expediente sin controles ⇒ lista vacía (no es un error)', async () => {
      const { svc } = escenario();
      await expect(svc.listar(1, {})).resolves.toEqual([]);
    });

    it('serie del más reciente al más antiguo con la variación de peso e IMC respecto del anterior (CA-15)', async () => {
      const { svc, control } = escenario();
      control({ id: 1, fecha: '2026-01-10', peso: 60.1, imc: 26 });
      control({ id: 2, fecha: '2026-04-10', peso: 58.4, imc: 25.3 });
      control({ id: 3, fecha: '2026-07-10', peso: 59, imc: 25.6 });
      const r = await svc.listar(1, {});
      expect(r.map((c) => [c.id, c.variacionPeso, c.variacionImc])).toEqual([
        [3, 0.6, 0.3],
        [2, -1.7, -0.7],
        [1, null, null],
      ]);
    });

    it('nunca recalcula: devuelve el IMC y la edad almacenados aunque peso y talla ya no los den', async () => {
      const { svc, control } = escenario();
      control({ id: 1, fecha: '2026-01-10', peso: 60, talla: 152, imc: 31.1, edadMomentoControl: 70 });
      const [c] = await svc.listar(1, {});
      expect(c).toMatchObject({ imc: 31.1, edadMomentoControl: 70 });
    });

    it('solo trae los controles del expediente pedido', async () => {
      const { svc, control } = escenario();
      control({ id: 1, fecha: '2026-01-10' });
      control({ id: 2, fecha: '2026-01-10', expedienteId: 2 });
      expect((await svc.listar(1, {})).map((c) => c.id)).toEqual([1]);
    });

    it('por defecto EXCLUYE los anulados; con incluirAnulados=true los trae', async () => {
      const { svc, control } = escenario();
      control({ id: 1, fecha: '2026-01-10' });
      control({ id: 2, fecha: '2026-02-10', anulado: true });
      expect((await svc.listar(1, {})).map((c) => c.id)).toEqual([1]);
      expect((await svc.listar(1, { incluirAnulados: false })).map((c) => c.id)).toEqual([1]);
      const r = await svc.listar(1, { incluirAnulados: true });
      expect(r.map((c) => c.id)).toEqual([2, 1]);
      expect(r[0]).toMatchObject({ anulado: true, variacionPeso: null });
    });

    it('desde/hasta inclusivos; la primera fila del rango se compara con el control previo real', async () => {
      const { svc, control } = escenario();
      control({ id: 1, fecha: '2026-01-10', peso: 60, imc: 26 });
      control({ id: 2, fecha: '2026-04-10', peso: 58, imc: 25.1 });
      control({ id: 3, fecha: '2026-07-10', peso: 59, imc: 25.5 });
      const r = await svc.listar(1, { desde: '2026-04-10', hasta: '2026-07-10' });
      expect(r.map((c) => c.id)).toEqual([3, 2]);
      expect(r[1]).toMatchObject({ variacionPeso: -2, variacionImc: -0.9 }); // contra el control 1, fuera del rango
    });
  });

  describe('anular', () => {
    it('anula con motivo, usuario y fecha, sin tocar IMC, edad ni medidas; toma el candado de la fila', async () => {
      const { svc, db } = escenario();
      const c = await svc.crear(1, { ...datos, fecha: HOY }, USUARIO);
      const r = await svc.anular(c.id, 'Se pesó al residente equivocado', 11);
      expect(r).toMatchObject({
        anulado: true,
        motivoAnulacion: 'Se pesó al residente equivocado',
        anuladoPorId: 11,
        modificadoPorId: 11,
        imc: 25.3,
        edadMomentoControl: 86,
        peso: 58.4,
      });
      expect(r.fechaAnulacion).toBeInstanceOf(Date);
      expect(db.log).toContain(`lock:ControlNutricional:${c.id}`);
    });

    it('control inexistente ⇒ 404', async () => {
      const { svc } = escenario();
      await expect(svc.anular(99, 'x', 11)).rejects.toThrow('Control nutricional 99 no existe');
    });

    it('anular dos veces ⇒ 409 y se conserva la anulación original', async () => {
      const { svc } = escenario();
      const c = await svc.crear(1, datos, USUARIO);
      await svc.anular(c.id, 'primera', 11);
      await expect(svc.anular(c.id, 'segunda', 12)).rejects.toThrow('El control nutricional ya está anulado');
      const [anulado] = await svc.listar(1, { incluirAnulados: true });
      expect(anulado).toMatchObject({ motivoAnulacion: 'primera', anuladoPorId: 11 });
    });

    it('tras anular, el siguiente control se compara con el último NO anulado', async () => {
      const { svc, control } = escenario();
      control({ id: 1, fecha: '2026-01-10', peso: 60, imc: 26 });
      control({ id: 2, fecha: '2026-02-10', peso: 90, imc: 39 });
      control({ id: 3, fecha: '2026-03-10', peso: 61, imc: 26.4 });
      await svc.anular(2, 'Error de digitación', 11);
      const r = await svc.listar(1, {});
      expect(r.map((c) => [c.id, c.variacionPeso])).toEqual([
        [3, 1],
        [1, null],
      ]);
    });
  });
});
