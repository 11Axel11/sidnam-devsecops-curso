/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- resultados del pipe sin tipar */
import 'reflect-metadata';
import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';
import { AnularRegistroDto } from 'src/common/dto/anular-registro.dto';
import {
  ActualizarValoracionNutricionalDto,
  CrearValoracionNutricionalDto,
} from './valoracion-nutricional.dto';

// Misma configuración que el ValidationPipe global de main.ts.
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const body = (metatype: new () => object): ArgumentMetadata => ({ type: 'body', metatype });
const crear = (b: object): Promise<any> => pipe.transform(b, body(CrearValoracionNutricionalDto));
const actualizar = (b: object): Promise<any> => pipe.transform(b, body(ActualizarValoracionNutricionalDto));

const BOOLEANOS = ['problemaVisual', 'problemaCavidadOral', 'alergiaMedicamentos', 'depresion', 'ansiedad'];

describe('DTOs de valoración nutricional', () => {
  it('un cuerpo vacío es válido (guardado parcial en borrador, RNF-08)', async () => {
    await expect(crear({})).resolves.toBeDefined();
  });

  it('CA-17: deambula con ayuda, deterioro leve y alergia a penicilina es válido', async () => {
    await expect(
      crear({
        fecha: '2026-10-21',
        datoFuncionalId: 2,
        estadoCognitivo: 'con_deterioro',
        nivelDeterioroCognitivo: 'leve',
        alergiaMedicamentos: true,
        detalleAlergiaMedicamentos: 'Penicilina',
        problemaVisual: false,
        problemaCavidadOral: true,
        depresion: false,
        ansiedad: true,
      }),
    ).resolves.toBeDefined();
  });

  it.each(['estado', 'anulado', 'expedienteId', 'usuarioResponsableId', 'creadoPorId', 'modificadoPorId', 'id', 'motivoAnulacion'])(
    'rechaza %s en el body (lo decide el servidor, 400)',
    async (campo) => {
      await expect(crear({ [campo]: 1 })).rejects.toBeInstanceOf(BadRequestException);
      await expect(actualizar({ [campo]: 1 })).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  describe.each([
    ['POST', crear],
    ['PATCH', actualizar],
  ] as const)('%s: booleanos NOT NULL', (_m, enviar) => {
    it.each(BOOLEANOS)('%s: null → 400 "must be a boolean value"', async (campo) => {
      const error = await enviar({ [campo]: null }).then(
        () => undefined,
        (e: unknown) => e,
      );
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({
        message: expect.arrayContaining([`${campo} must be a boolean value`]) as unknown,
      });
    });

    it.each(BOOLEANOS)('%s: omitido → válido y undefined (aplica el default)', async (campo) => {
      expect((await enviar({}))[campo]).toBeUndefined();
    });

    it.each(BOOLEANOS.flatMap((c) => [[c, true] as const, [c, false] as const]))('%s: %s → válido', async (campo, valor) => {
      expect((await enviar({ [campo]: valor }))[campo]).toBe(valor);
    });

    it.each(['sí', 'false', 'true', 1, 0])('problemaVisual: %j (no booleano) → 400', async (valor) => {
      await expect(enviar({ problemaVisual: valor })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('estadoCognitivo: null → 400 (columna NOT NULL); omitido → válido', async () => {
      await expect(enviar({ estadoCognitivo: null })).rejects.toBeInstanceOf(BadRequestException);
      await expect(enviar({})).resolves.toBeDefined();
    });
  });

  describe('estadoCognitivo (enum cerrado)', () => {
    it.each(['normal', 'con_deterioro'])('acepta %s', async (v) => {
      await expect(crear({ estadoCognitivo: v })).resolves.toBeDefined();
    });
    it.each(['leve', 'Normal', 'CON_DETERIORO', 'deterioro', '', 1])('rechaza %j', async (v) => {
      const error = await crear({ estadoCognitivo: v }).then(
        () => undefined,
        (e: unknown) => e,
      );
      expect(error).toBeInstanceOf(BadRequestException);
      expect(JSON.stringify((error as BadRequestException).getResponse())).toContain(
        'estadoCognitivo must be one of the following values: normal, con_deterioro',
      );
    });
  });

  describe('datoFuncionalId (FK al catálogo)', () => {
    it.each([1, 2, 99])('acepta %s', async (n) => {
      await expect(crear({ datoFuncionalId: n })).resolves.toBeDefined();
    });
    it('null limpia el valor (POST y PATCH); omitido también es válido', async () => {
      expect((await crear({ datoFuncionalId: null })).datoFuncionalId).toBeNull();
      expect((await actualizar({ datoFuncionalId: null })).datoFuncionalId).toBeNull();
    });
    it.each([[0], [-1], [1.5], ['2'], ['abc']])('rechaza %j', async (v) => {
      await expect(crear({ datoFuncionalId: v })).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  it.each([['15/09/2026'], ['2026-9-5'], ['hoy'], [20261021]])('fecha mal formada %j → 400', async (f) => {
    await expect(crear({ fecha: f })).rejects.toBeInstanceOf(BadRequestException);
  });

  describe('textos', () => {
    it('detalle de alergia de más de 2000 caracteres: íntegro (sin truncar ni fragmentar)', async () => {
      const largo = 'Alergia documentada a penicilinas y derivados ñ. '.repeat(60);
      expect(largo.length).toBeGreaterThan(2000);
      expect((await crear({ detalleAlergiaMedicamentos: largo })).detalleAlergiaMedicamentos).toBe(largo.trim());
    });

    it('detalle >20 000 → 400', async () => {
      await expect(crear({ detalleAlergiaMedicamentos: 'x'.repeat(20001) })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('recorta espacios, vacío → null, y null se conserva (limpiar en PATCH)', async () => {
      const r = await crear({ detalleAlergiaMedicamentos: '  ', nivelDeterioroCognitivo: 'leve' });
      expect(r.detalleAlergiaMedicamentos).toBeNull();
      expect(r.nivelDeterioroCognitivo).toBe('leve');
      const p = await actualizar({ detalleAlergiaMedicamentos: null, nivelDeterioroCognitivo: null });
      expect(p.detalleAlergiaMedicamentos).toBeNull();
      expect(p.nivelDeterioroCognitivo).toBeNull();
    });

    it('un texto que no es string → 400', async () => {
      await expect(crear({ detalleAlergiaMedicamentos: 123 })).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('anular exige justificación (RN-02)', () => {
    const anular = (b: object): Promise<any> => pipe.transform(b, body(AnularRegistroDto));
    it('con motivo: ok y recortado', async () => {
      expect((await anular({ motivo: '  Expediente equivocado ' })).motivo).toBe('Expediente equivocado');
    });
    it.each([[{}], [{ motivo: '' }], [{ motivo: '   ' }], [{ motivo: 'x'.repeat(2001) }]])('rechaza %j', async (b) => {
      await expect(anular(b)).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
