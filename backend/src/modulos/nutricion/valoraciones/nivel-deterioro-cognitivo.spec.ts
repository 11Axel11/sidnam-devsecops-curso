/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument -- pipe y base simulada sin tipar */
import 'reflect-metadata';
import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';
import { EstadoValoracion } from 'src/common/enums/estadoValoracion.enum';
import { DatoFuncionalNutricion } from 'src/modulos/catalogos/entities/catalogos.entities';
import { crearDbSimulada } from 'src/modulos/terapia-fisica/valoraciones/testing/db-simulada';
import { ValoracionNutricional } from '../entities/valoracion-nutricional.entity';
import { EstadoCognitivo } from '../enums/estado-cognitivo.enum';
import { NIVELES_DETERIORO_COGNITIVO } from '../enums/nivel-deterioro-cognitivo';
import { ActualizarValoracionNutricionalDto, CrearValoracionNutricionalDto } from './dto/valoracion-nutricional.dto';
import { camposFaltantesParaConfirmar, validarCoherencia } from './valoracion-nutricional.reglas';
import { ValoracionesNutricionalesService } from './valoraciones-nutricionales.service';

/**
 * `nivelDeterioroCognitivo` pasa de texto libre a LISTA CERRADA (leve / moderado / severo; decisión de la Jefatura,
 * octubre 2026). Se mantienen las reglas: solo aplica con `con_deterioro` y es obligatorio para confirmar en ese caso.
 */
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const body = (metatype: new () => object): ArgumentMetadata => ({ type: 'body', metatype });
const crear = (b: object): Promise<any> => pipe.transform(b, body(CrearValoracionNutricionalDto));
const actualizar = (b: object): Promise<any> => pipe.transform(b, body(ActualizarValoracionNutricionalDto));
const mensajes = async (p: Promise<unknown>): Promise<string[]> => {
  try {
    await p;
    return [];
  } catch (e) {
    return ((e as BadRequestException).getResponse() as { message: string[] }).message;
  }
};
const MENSAJE = 'nivelDeterioroCognitivo must be one of the following values: leve, moderado, severo';

describe('nivelDeterioroCognitivo — lista cerrada', () => {
  it('la lista es exactamente leve, moderado, severo (en minúsculas)', () => {
    expect([...NIVELES_DETERIORO_COGNITIVO]).toEqual(['leve', 'moderado', 'severo']);
  });

  describe.each([
    ['POST', crear],
    ['PATCH', actualizar],
  ])('DTO %s', (_nombre, validar) => {
    it.each(['leve', 'moderado', 'severo'])('acepta «%s»', async (nivel) => {
      expect((await validar({ estadoCognitivo: 'con_deterioro', nivelDeterioroCognitivo: nivel })).nivelDeterioroCognitivo).toBe(nivel);
    });

    it('null y ausente son válidos (null limpia; ausente no toca)', async () => {
      expect((await validar({ nivelDeterioroCognitivo: null })).nivelDeterioroCognitivo).toBeNull();
      expect((await validar({})).nivelDeterioroCognitivo).toBeUndefined();
    });

    it.each([
      ['Leve (mayúscula)', 'Leve'],
      ['LEVE', 'LEVE'],
      [' leve (con espacios)', ' leve '],
      ['vacío', ''],
      ['en blanco', '   '],
      ['texto libre anterior', 'Deterioro leve con desorientación'],
      ['grave (no está en la lista)', 'grave'],
      ['moderada (género distinto)', 'moderada'],
      ['número', 1],
      ['booleano', true],
      ['arreglo', ['leve']],
      ['objeto', { nivel: 'leve' }],
    ])('rechaza %s con un único mensaje', async (_caso, valor) => {
      expect(await mensajes(validar({ nivelDeterioroCognitivo: valor }))).toEqual([MENSAJE]);
    });

    it('el mensaje de error es exactamente el del contrato', async () => {
      expect(await mensajes(validar({ nivelDeterioroCognitivo: 'x' }))).toEqual(['nivelDeterioroCognitivo must be one of the following values: leve, moderado, severo']);
    });
  });
});

describe('reglas con la lista cerrada (se mantienen)', () => {
  it.each(NIVELES_DETERIORO_COGNITIVO)('«%s» con estado normal ⇒ incoherente (solo aplica con con_deterioro)', (nivel) => {
    expect(validarCoherencia({ estadoCognitivo: EstadoCognitivo.NORMAL, nivelDeterioroCognitivo: nivel })).toEqual([
      'nivelDeterioroCognitivo solo aplica si estadoCognitivo es con_deterioro',
    ]);
  });

  it.each(NIVELES_DETERIORO_COGNITIVO)('«%s» con con_deterioro ⇒ coherente', (nivel) => {
    expect(validarCoherencia({ estadoCognitivo: EstadoCognitivo.CON_DETERIORO, nivelDeterioroCognitivo: nivel })).toEqual([]);
  });

  it('con_deterioro sin nivel ⇒ falta para confirmar; con cualquiera de los tres ⇒ completa', () => {
    const base = { fecha: '2026-10-01', datoFuncionalId: 2, estadoCognitivo: EstadoCognitivo.CON_DETERIORO };
    expect(camposFaltantesParaConfirmar(base)).toEqual(['nivelDeterioroCognitivo']);
    expect(camposFaltantesParaConfirmar({ ...base, nivelDeterioroCognitivo: null })).toEqual(['nivelDeterioroCognitivo']);
    for (const nivel of NIVELES_DETERIORO_COGNITIVO) expect(camposFaltantesParaConfirmar({ ...base, nivelDeterioroCognitivo: nivel })).toEqual([]);
  });

  it('estado normal no exige nivel', () => {
    expect(camposFaltantesParaConfirmar({ fecha: '2026-10-01', datoFuncionalId: 2, estadoCognitivo: EstadoCognitivo.NORMAL })).toEqual([]);
  });
});

describe('servicio con la lista cerrada (base simulada)', () => {
  const escenario = () => {
    const db = crearDbSimulada([1]);
    db.insertar(DatoFuncionalNutricion, { id: 2, nombre: 'Deambula con ayuda', activo: true });
    return { db, svc: new ValoracionesNutricionalesService(db.dataSource) };
  };

  it.each(NIVELES_DETERIORO_COGNITIVO)('crea con «%s», lo confirma y lo conserva', async (nivel) => {
    const { svc } = escenario();
    const v = await svc.crear(1, { datoFuncionalId: 2, estadoCognitivo: EstadoCognitivo.CON_DETERIORO, nivelDeterioroCognitivo: nivel }, 5);
    expect(v.nivelDeterioroCognitivo).toBe(nivel);
    await expect(svc.confirmar(v.id, 5)).resolves.toMatchObject({ estado: EstadoValoracion.VIGENTE, nivelDeterioroCognitivo: nivel });
  });

  it('confirmar con con_deterioro y SIN nivel ⇒ 400 con faltantes [nivelDeterioroCognitivo]', async () => {
    const { svc } = escenario();
    const v = await svc.crear(1, { datoFuncionalId: 2, estadoCognitivo: EstadoCognitivo.CON_DETERIORO }, 5);
    const e = await svc.confirmar(v.id, 5).then(
      () => undefined,
      (x: unknown) => x as BadRequestException,
    );
    expect(e).toBeInstanceOf(BadRequestException);
    expect((e!.getResponse() as { faltantes: string[] }).faltantes).toEqual(['nivelDeterioroCognitivo']);
  });

  it('un nivel con estado normal ⇒ 400 con el texto exacto, y con null en la misma petición ⇒ ok', async () => {
    const { svc } = escenario();
    const e = await svc.crear(1, { nivelDeterioroCognitivo: 'moderado' }, 5).then(
      () => undefined,
      (x: unknown) => x as BadRequestException,
    );
    expect(e).toBeInstanceOf(BadRequestException);
    expect((e!.getResponse() as { errores: string[] }).errores).toEqual(['nivelDeterioroCognitivo solo aplica si estadoCognitivo es con_deterioro']);

    const v = await svc.crear(1, { estadoCognitivo: EstadoCognitivo.CON_DETERIORO, nivelDeterioroCognitivo: 'severo' }, 5);
    await expect(svc.actualizar(v.id, { estadoCognitivo: EstadoCognitivo.NORMAL, nivelDeterioroCognitivo: null }, 5)).resolves.toMatchObject({
      estadoCognitivo: 'normal',
      nivelDeterioroCognitivo: null,
    });
  });

  it('cambiar el nivel en un borrador con PATCH (leve → severo) y limpiarlo con null', async () => {
    const { svc } = escenario();
    const v = await svc.crear(1, { estadoCognitivo: EstadoCognitivo.CON_DETERIORO, nivelDeterioroCognitivo: 'leve' }, 5);
    await expect(svc.actualizar(v.id, { nivelDeterioroCognitivo: 'severo' }, 5)).resolves.toMatchObject({ nivelDeterioroCognitivo: 'severo' });
    await expect(svc.actualizar(v.id, { nivelDeterioroCognitivo: null }, 5)).resolves.toMatchObject({ nivelDeterioroCognitivo: null });
  });

  it('el servicio NO reescribe un valor guardado antes de la lista cerrada (se lee tal cual; lo normaliza el SQL de dev)', async () => {
    const { db, svc } = escenario();
    db.insertar(ValoracionNutricional, {
      id: 50, expedienteId: 1, fecha: '2026-10-01', estado: EstadoValoracion.REEMPLAZADA, estadoCognitivo: 'con_deterioro', nivelDeterioroCognitivo: 'Leve', anulado: false,
    });
    expect((await svc.listar(1))[0].nivelDeterioroCognitivo).toBe('Leve');
  });
});
