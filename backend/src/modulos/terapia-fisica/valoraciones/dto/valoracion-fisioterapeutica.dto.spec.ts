/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- resultados del pipe sin tipar */
import 'reflect-metadata';
import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';
import {
  ActualizarValoracionFisioterapeuticaDto,
  CrearValoracionFisioterapeuticaDto,
} from './valoracion-fisioterapeutica.dto';
import { AnularRegistroDto } from 'src/common/dto/anular-registro.dto';

// Misma configuración que el ValidationPipe global de main.ts.
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const body = (metatype: new () => object): ArgumentMetadata => ({ type: 'body', metatype });
const crear = (b: object) => pipe.transform(b, body(CrearValoracionFisioterapeuticaDto));

describe('DTOs de valoración fisioterapéutica', () => {
  it('un cuerpo vacío es válido (guardado parcial en borrador, RNF-08)', async () => {
    await expect(crear({})).resolves.toBeDefined();
  });

  it('el ejemplo completo de la tarea B.1.3 es válido', async () => {
    await expect(
      crear({
        fecha: '2026-09-15',
        otrosDiagnosticos: 'x',
        antecedentesCaidas: true,
        detalleCaidas: 'Caída en el baño',
        usoAyudasBiomecanicas: true,
        detalleAyudasBiomecanicas: 'Bastón',
        presentaDolor: true,
        zonaDolorosa: 'Rodilla derecha',
        caracteristicasDolor: ['punzante', 'irradiado'],
        direccionIrradiacion: 'Miembro inferior derecho',
        intensidadDolor: 6,
        orientacionPersona: true,
        orientacionEspacio: true,
        orientacionTiempo: false,
        conscienteOrientado: true,
        cambiosConductuales: 'x',
        estadosAnimo: 'x',
        rangoMovimiento: 'x',
        fuerzaMuscularDinamometria: 'x',
        postura: 'x',
        riesgoUlcera: 'x',
        diagnosticoDiferencial: 'x',
        tratamiento: 'x',
      }),
    ).resolves.toBeDefined();
  });

  it.each([['estado'], ['anulado'], ['expedienteId'], ['usuarioResponsableId'], ['creadoPorId'], ['modificadoPorId'], ['id'], ['motivoAnulacion']])(
    'rechaza %s en el body (lo decide el servidor, 400)',
    async (campo) => {
      await expect(crear({ [campo]: 1 })).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  describe('RF-TF-04: intensidad entera 1–10', () => {
    it.each([1, 5, 10])('acepta %s', async (n) => {
      await expect(crear({ intensidadDolor: n })).resolves.toBeDefined();
    });
    it.each([[0], [11], [-1], [5.5], ['7'], ['abc']])('rechaza %j', async (n) => {
      await expect(crear({ intensidadDolor: n })).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  it('características del dolor: solo valores del catálogo, sin repetidos', async () => {
    await expect(crear({ caracteristicasDolor: ['punzante', 'opresivo', 'quemante', 'irradiado'] })).resolves.toBeDefined();
    await expect(crear({ caracteristicasDolor: ['sordo'] })).rejects.toBeInstanceOf(BadRequestException);
    await expect(crear({ caracteristicasDolor: ['punzante', 'punzante'] })).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([['15/09/2026'], ['2026-9-5'], ['hoy'], [20260915]])('fecha mal formada %j → 400', async (f) => {
    await expect(crear({ fecha: f })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('booleanos: "false" como string NO se acepta (no hay conversión silenciosa a true)', async () => {
    await expect(crear({ presentaDolor: 'false' })).rejects.toBeInstanceOf(BadRequestException);
    const r: any = await crear({ presentaDolor: false });
    expect(r.presentaDolor).toBe(false);
  });

  describe('booleanos NOT NULL: null → 400 (no 500 de MySQL), omitido → válido', () => {
    const CAMPOS = [
      'antecedentesCaidas',
      'usoAyudasBiomecanicas',
      'presentaDolor',
      'orientacionPersona',
      'orientacionEspacio',
      'orientacionTiempo',
      'conscienteOrientado',
    ];
    const actualizar = (b: object): Promise<any> => pipe.transform(b, body(ActualizarValoracionFisioterapeuticaDto));
    const casos: [string, (b: object) => Promise<any>][] = [
      ['POST', crear],
      ['PATCH', actualizar],
    ];

    describe.each(casos)('%s', (_metodo, enviar) => {
      it.each(CAMPOS)('%s: null → 400 con "must be a boolean value"', async (campo) => {
        const error = await enviar({ [campo]: null }).then(
          () => undefined,
          (e: unknown) => e,
        );
        expect(error).toBeInstanceOf(BadRequestException);
        expect((error as BadRequestException).getResponse()).toMatchObject({
          message: expect.arrayContaining([`${campo} must be a boolean value`]) as unknown,
        });
      });

      it.each(CAMPOS)('%s: omitido → válido y undefined (aplica el default)', async (campo) => {
        const r = await enviar({});
        expect(r[campo]).toBeUndefined();
      });

      it.each(CAMPOS.flatMap((c) => [[c, true] as const, [c, false] as const]))('%s: %s → válido y conservado', async (campo, valor) => {
        const r = await enviar({ [campo]: valor });
        expect(r[campo]).toBe(valor);
      });

      it.each(CAMPOS)('%s: explícitamente undefined → válido', async (campo) => {
        await expect(enviar({ [campo]: undefined })).resolves.toBeDefined();
      });
    });

    it('PATCH: los textos y enteros siguen admitiendo null (limpiar el valor)', async () => {
      const r = await actualizar({ tratamiento: null, intensidadDolor: null, zonaDolorosa: null, caracteristicasDolor: null, fecha: undefined });
      expect(r.tratamiento).toBeNull();
      expect(r.intensidadDolor).toBeNull();
      expect(r.zonaDolorosa).toBeNull();
      expect(r.caracteristicasDolor).toBeNull();
    });
  });

  describe('texto largo (CA-06)', () => {
    it('acepta un tratamiento de más de 2000 caracteres, intacto (sin truncar ni fragmentar)', async () => {
      const largo = 'Ejercicio terapéutico ' + 'ñ'.repeat(5000);
      const r: any = await crear({ tratamiento: largo, diagnosticoDiferencial: largo });
      expect(r.tratamiento).toBe(largo.trim());
      expect(r.tratamiento.length).toBeGreaterThan(2000);
    });
    it('rechaza lo que no cabría en la columna text (en vez de un 500 de la base)', async () => {
      await expect(crear({ tratamiento: 'x'.repeat(20001) })).rejects.toBeInstanceOf(BadRequestException);
    });
    it('recorta espacios y un texto vacío pasa a null (permite limpiar el campo)', async () => {
      const r: any = await crear({ detalleCaidas: '  ', postura: '  de pie  ' });
      expect(r.detalleCaidas).toBeNull();
      expect(r.postura).toBe('de pie');
    });
    it('null explícito se conserva (limpiar un campo con PATCH)', async () => {
      const r: any = await crear({ intensidadDolor: null, tratamiento: null });
      expect(r.intensidadDolor).toBeNull();
      expect(r.tratamiento).toBeNull();
    });
  });

  it('PATCH: mismos campos, todos opcionales, con las mismas validaciones', async () => {
    const act = (b: object) => pipe.transform(b, body(ActualizarValoracionFisioterapeuticaDto));
    await expect(act({})).resolves.toBeDefined();
    await expect(act({ intensidadDolor: 3 })).resolves.toBeDefined();
    await expect(act({ intensidadDolor: 11 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(act({ estado: 'vigente' })).rejects.toBeInstanceOf(BadRequestException);
  });

  describe('anular exige justificación (RN-02)', () => {
    const anular = (b: object) => pipe.transform(b, body(AnularRegistroDto));
    it('con motivo: ok y recortado', async () => {
      const r: any = await anular({ motivo: '  Expediente equivocado ' });
      expect(r.motivo).toBe('Expediente equivocado');
    });
    it.each([[{}], [{ motivo: '' }], [{ motivo: '   ' }], [{ motivo: 'x'.repeat(2001) }]])('rechaza %j', async (b) => {
      await expect(anular(b)).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
