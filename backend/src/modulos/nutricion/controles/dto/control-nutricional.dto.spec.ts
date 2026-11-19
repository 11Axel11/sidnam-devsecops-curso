import 'reflect-metadata';
import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';
import { generarTextoLargo } from 'src/common/testing/texto-largo.helper';
import { MAX_TEXTO_LIBRE } from 'src/common/validators/texto-libre.decorator';
import { RANGOS_CONTROL } from '../control-nutricional.reglas';
import { CrearControlNutricionalDto } from './control-nutricional.dto';

// Misma configuración que el ValidationPipe global de main.ts.
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const meta: ArgumentMetadata = { type: 'body', metatype: CrearControlNutricionalDto };
const validar = (valor: unknown) => pipe.transform(valor, meta) as Promise<CrearControlNutricionalDto>;
const mensajes = async (valor: unknown): Promise<string[]> => {
  try {
    await validar(valor);
    return [];
  } catch (e) {
    return ((e as BadRequestException).getResponse() as { message: string[] }).message;
  }
};
const base = { peso: 58.4, talla: 152 };

describe('CrearControlNutricionalDto', () => {
  describe('campos aceptados', () => {
    it('solo peso y talla bastan (todo lo demás es opcional)', async () => {
      expect(await mensajes(base)).toEqual([]);
    });

    it('acepta el control completo', async () => {
      const completo = {
        fecha: '2026-10-21',
        ...base,
        circunferenciaBraquial: 27.5,
        circunferenciaPantorrilla: 32,
        alturaRodilla: 47.5,
        fuerzaMuscular: 18.5,
        interpretacion: 'Estado nutricional adecuado',
      };
      expect(await validar(completo)).toEqual(completo);
    });

    it('los opcionales aceptan null (equivale a no registrarlos)', async () => {
      const r = await validar({
        ...base,
        circunferenciaBraquial: null,
        circunferenciaPantorrilla: null,
        alturaRodilla: null,
        fuerzaMuscular: null,
        interpretacion: null,
        fecha: null,
      });
      expect(r.fuerzaMuscular).toBeNull();
      expect(r.interpretacion).toBeNull();
    });
  });

  describe('lo que el cliente NO puede enviar', () => {
    it.each(['imc', 'edadMomentoControl', 'expedienteId', 'anulado', 'motivoAnulacion', 'anuladoPorId', 'fechaAnulacion', 'creadoPorId', 'modificadoPorId', 'fechaCreacion', 'id', 'interpretacionImc'])(
      'rechaza %s con 400 (whitelist)',
      async (campo) => {
        expect((await mensajes({ ...base, [campo]: 1 })).join()).toContain(`property ${campo} should not exist`);
      },
    );
  });

  describe('peso y talla (obligatorios, numéricos, con rango y a lo sumo 1 decimal)', () => {
    it.each(['peso', 'talla'])('%s es obligatorio y no admite null', async (campo) => {
      const sin = { ...base } as Record<string, unknown>;
      delete sin[campo];
      expect((await mensajes(sin)).join()).toContain(campo);
      expect((await mensajes({ ...base, [campo]: null })).join()).toContain(campo);
    });

    it('no acepta texto ni números como cadena', async () => {
      expect((await mensajes({ ...base, peso: '58.4' })).join()).toContain('peso must be a number');
      expect((await mensajes({ ...base, talla: 'alta' })).join()).toContain('talla must be a number');
    });

    it('rechaza más de 1 decimal', async () => {
      expect((await mensajes({ ...base, peso: 58.45 })).join()).toContain('peso must be a number conforming');
      expect((await mensajes({ ...base, talla: 152.25 })).join()).toContain('talla must be a number conforming');
    });

    it('rechaza NaN e Infinity', async () => {
      expect((await mensajes({ ...base, peso: Number.NaN })).join()).toContain('peso');
      expect((await mensajes({ ...base, talla: Number.POSITIVE_INFINITY })).join()).toContain('talla');
    });
  });

  describe('rangos (límites inclusivos; anti-error de digitación)', () => {
    const casos: [keyof typeof RANGOS_CONTROL, boolean][] = [
      ['peso', true],
      ['talla', true],
      ['circunferenciaBraquial', false],
      ['circunferenciaPantorrilla', false],
      ['alturaRodilla', false],
      ['fuerzaMuscular', false],
    ];

    it.each(casos)('%s: acepta el mínimo y el máximo', async (campo) => {
      const { min, max } = RANGOS_CONTROL[campo];
      expect(await mensajes({ ...base, [campo]: min })).toEqual([]);
      expect(await mensajes({ ...base, [campo]: max })).toEqual([]);
    });

    it.each(casos)('%s: rechaza por debajo del mínimo y por encima del máximo', async (campo) => {
      const { min, max } = RANGOS_CONTROL[campo];
      if (min > 0) expect((await mensajes({ ...base, [campo]: min - 0.1 })).join()).toContain(`${campo} must not be less than ${min}`);
      expect((await mensajes({ ...base, [campo]: -1 })).join()).toContain(`${campo} must not be less than`);
      expect((await mensajes({ ...base, [campo]: max + 0.1 })).join()).toContain(`${campo} must not be greater than ${max}`);
    });

    it('errores típicos de digitación: talla en metros o peso en libras fuera de rango', async () => {
      expect((await mensajes({ peso: 58.4, talla: 1.52 })).join()).toContain('talla must not be less than 100');
      expect((await mensajes({ peso: 580, talla: 152 })).join()).toContain('peso must not be greater than 250');
    });

    it('fuerzaMuscular 0 es válido (no logró ejercer fuerza)', async () => {
      expect(await mensajes({ ...base, fuerzaMuscular: 0 })).toEqual([]);
    });
  });

  describe('fecha', () => {
    it('acepta YYYY-MM-DD', async () => {
      expect(await mensajes({ ...base, fecha: '2026-10-21' })).toEqual([]);
    });

    it.each(['21/10/2026', '2026-1-1', '2026-10-21T10:00', 'hoy'])('rechaza el formato %p', async (fecha) => {
      expect(await mensajes({ ...base, fecha })).toContain('fecha debe tener formato YYYY-MM-DD');
    });
  });

  describe('interpretacion (texto libre digitado por el profesional)', () => {
    it('se recorta y el vacío se convierte en null', async () => {
      expect((await validar({ ...base, interpretacion: '  Adecuado  ' })).interpretacion).toBe('Adecuado');
      expect((await validar({ ...base, interpretacion: '   ' })).interpretacion).toBeNull();
    });

    it('admite texto largo (> 2000 caracteres, CA-06) hasta el máximo y rechaza el exceso', async () => {
      expect(await mensajes({ ...base, interpretacion: generarTextoLargo(2500) })).toEqual([]);
      expect(await mensajes({ ...base, interpretacion: generarTextoLargo(MAX_TEXTO_LIBRE) })).toEqual([]);
      expect((await mensajes({ ...base, interpretacion: generarTextoLargo(MAX_TEXTO_LIBRE + 1) })).join()).toContain(
        'interpretacion must be shorter than or equal to',
      );
    });

    it('rechaza lo que no es texto', async () => {
      expect((await mensajes({ ...base, interpretacion: 123 })).join()).toContain('interpretacion must be a string');
    });
  });
});
