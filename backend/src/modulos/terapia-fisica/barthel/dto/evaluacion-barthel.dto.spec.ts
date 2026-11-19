import 'reflect-metadata';
import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';
import { generarTextoLargo } from 'src/common/testing/texto-largo.helper';
import { MAX_TEXTO_LIBRE } from 'src/common/validators/texto-libre.decorator';
import { puntosPermitidos } from 'src/common/valoraciones/instrumento';
import { ITEMS_BARTHEL_V1 } from '../barthel-v1.instrumento';
import { CrearEvaluacionBarthelDto } from './evaluacion-barthel.dto';

// Misma configuración que el ValidationPipe global de main.ts.
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const meta: ArgumentMetadata = { type: 'body', metatype: CrearEvaluacionBarthelDto };
const validar = (valor: unknown) => pipe.transform(valor, meta) as Promise<CrearEvaluacionBarthelDto>;
const mensajes = async (valor: unknown): Promise<string[]> => {
  try {
    await validar(valor);
    return [];
  } catch (e) {
    return ((e as BadRequestException).getResponse() as { message: string[] }).message;
  }
};
const permitidos = (campo: string): number[] => puntosPermitidos(ITEMS_BARTHEL_V1.find((i) => i.campo === campo)!);

const items = {
  comer: 10,
  lavarse: 5,
  vestirse: 10,
  arreglarse: 5,
  deposiciones: 10,
  miccion: 10,
  usarRetrete: 10,
  trasladarse: 15,
  deambular: 15,
  escalones: 10,
};

describe('CrearEvaluacionBarthelDto (RF-TF-08)', () => {
  it('acepta los diez ítems; fecha y observaciones son opcionales', async () => {
    expect(await mensajes(items)).toEqual([]);
  });

  it('acepta la evaluación completa y recorta las observaciones', async () => {
    const r = await validar({ ...items, fecha: '2026-10-21', observaciones: '  Camina con bastón  ' });
    expect(r).toMatchObject({ ...items, fecha: '2026-10-21', observaciones: 'Camina con bastón' });
  });

  describe('cada ítem admite SOLO los valores discretos de su tabla (Anexo A)', () => {
    it.each(ITEMS_BARTHEL_V1.map((i) => [i.campo]))('%s: acepta cada valor permitido y rechaza cualquier otro entero de -5 a 20', async (campo) => {
      const ok = permitidos(campo);
      for (let v = -5; v <= 20; v++) {
        const mensajesDelValor = await mensajes({ ...items, [campo]: v });
        if (ok.includes(v)) expect(mensajesDelValor).toEqual([]);
        else expect(mensajesDelValor).toEqual([`${campo} debe ser uno de los valores permitidos: ${ok.join(', ')}`]);
      }
    });

    it.each([
      ['comer', 7],
      ['comer', 15],
      ['lavarse', 10],
      ['arreglarse', 10],
      ['trasladarse', 20],
      ['deambular', 1],
      ['escalones', 15],
    ])('ejemplos del rango: %s = %p', async (campo, valor) => {
      expect((await mensajes({ ...items, [campo]: valor }))[0]).toContain(`${campo} debe ser uno de los valores permitidos`);
    });

    it.each([5.5, '10', '', null, true, [10], {}])('un valor que no es un entero de la tabla (%p) se rechaza con un solo mensaje', async (valor) => {
      expect(await mensajes({ ...items, comer: valor })).toEqual(['comer debe ser uno de los valores permitidos: 10, 5, 0']);
    });

    it.each(ITEMS_BARTHEL_V1.map((i) => [i.campo]))('%s es obligatorio (ausente ⇒ 400)', async (campo) => {
      const sin = { ...items } as Record<string, unknown>;
      delete sin[campo];
      expect((await mensajes(sin))[0]).toContain(`${campo} debe ser uno de los valores permitidos`);
    });

    it('un cuerpo vacío informa los diez ítems', async () => {
      expect(await mensajes({})).toHaveLength(10);
    });
  });

  describe('lo que el cliente NO puede enviar', () => {
    it.each([
      'puntajeTotal',
      'gradoDependencia',
      'versionInstrumento',
      'usuarioExaminadorId',
      'expedienteId',
      'anulado',
      'motivoAnulacion',
      'anuladoPorId',
      'fechaAnulacion',
      'creadoPorId',
      'modificadoPorId',
      'fechaCreacion',
      'fechaModificacion',
      'id',
      'edadMomentoEvaluacion',
      'silla',
    ])('rechaza %s con 400 (whitelist)', async (campo) => {
      expect((await mensajes({ ...items, [campo]: 1 })).join()).toContain(`property ${campo} should not exist`);
    });
  });

  describe('fecha', () => {
    it('acepta YYYY-MM-DD y null (equivale a hoy)', async () => {
      expect(await mensajes({ ...items, fecha: '2026-10-21' })).toEqual([]);
      expect(await mensajes({ ...items, fecha: null })).toEqual([]);
    });

    it.each(['21/10/2026', '2026-1-1', '2026-10-21T10:00', 'hoy'])('rechaza el formato %p', async (fecha) => {
      expect(await mensajes({ ...items, fecha })).toContain('fecha debe tener formato YYYY-MM-DD');
    });
  });

  describe('observaciones (texto libre)', () => {
    it('el vacío se convierte en null; null y ausente son válidos', async () => {
      expect((await validar({ ...items, observaciones: '   ' })).observaciones).toBeNull();
      expect(await mensajes({ ...items, observaciones: null })).toEqual([]);
    });

    it('admite texto largo (> 2000 caracteres, CA-06) hasta el máximo y rechaza el exceso', async () => {
      expect(await mensajes({ ...items, observaciones: generarTextoLargo(2500) })).toEqual([]);
      expect(await mensajes({ ...items, observaciones: generarTextoLargo(MAX_TEXTO_LIBRE) })).toEqual([]);
      expect((await mensajes({ ...items, observaciones: generarTextoLargo(MAX_TEXTO_LIBRE + 1) })).join()).toContain(
        'observaciones must be shorter than or equal to',
      );
    });

    it('rechaza lo que no es texto', async () => {
      expect((await mensajes({ ...items, observaciones: 123 })).join()).toContain('observaciones must be a string');
    });
  });
});
