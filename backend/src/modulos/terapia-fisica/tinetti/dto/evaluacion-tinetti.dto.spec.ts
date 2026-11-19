import 'reflect-metadata';
import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';
import { generarTextoLargo } from 'src/common/testing/texto-largo.helper';
import { MAX_TEXTO_LIBRE } from 'src/common/validators/texto-libre.decorator';
import { puntosPermitidos } from 'src/common/valoraciones/instrumento';
import { ITEMS_TINETTI_V1 } from '../tinetti-v1.instrumento';
import { CrearEvaluacionTinettiDto } from './evaluacion-tinetti.dto';

// Misma configuración que el ValidationPipe global de main.ts.
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const meta: ArgumentMetadata = { type: 'body', metatype: CrearEvaluacionTinettiDto };
const validar = (valor: unknown) => pipe.transform(valor, meta) as Promise<CrearEvaluacionTinettiDto>;
const mensajes = async (valor: unknown): Promise<string[]> => {
  try {
    await validar(valor);
    return [];
  } catch (e) {
    return ((e as BadRequestException).getResponse() as { message: string[] }).message;
  }
};
const permitidos = (campo: string): number[] => puntosPermitidos(ITEMS_TINETTI_V1.find((i) => i.campo === campo)!);
const maximo = Object.fromEntries(ITEMS_TINETTI_V1.map((i) => [i.campo, Math.max(...puntosPermitidos(i))]));

describe('CrearEvaluacionTinettiDto (RF-TF-09)', () => {
  it('acepta los veinte ítems; fecha y observaciones son opcionales', async () => {
    expect(await mensajes(maximo)).toEqual([]);
  });

  it('acepta la evaluación completa y recorta las observaciones', async () => {
    const r = await validar({ ...maximo, fecha: '2026-10-21', observaciones: '  Usa bastón  ' });
    expect(r).toMatchObject({ ...maximo, fecha: '2026-10-21', observaciones: 'Usa bastón' });
  });

  describe('cada ítem admite SOLO los valores discretos de su tabla (Anexo B)', () => {
    it.each(ITEMS_TINETTI_V1.map((i) => [i.campo]))('%s: acepta cada valor permitido y rechaza cualquier otro entero de -2 a 5', async (campo) => {
      const ok = permitidos(campo);
      for (let v = -2; v <= 5; v++) {
        const m = await mensajes({ ...maximo, [campo]: v });
        if (ok.includes(v)) expect(m).toEqual([]);
        else expect(m).toEqual([`${campo} debe ser uno de los valores permitidos: ${ok.join(', ')}`]);
      }
    });

    it.each([
      ['equilibrioSentado', 2],
      ['ojosCerrados', 2],
      ['giro360Continuidad', 2],
      ['inicioMarcha', 2],
      ['posturaMarcha', 2],
      ['sentarse', 3],
      ['trayectoria', 3],
    ])('ejemplos: %s = %p supera su máximo', async (campo, valor) => {
      expect((await mensajes({ ...maximo, [campo]: valor }))[0]).toContain(`${campo} debe ser uno de los valores permitidos`);
    });

    it.each([1.5, '1', '', null, true, [1], {}])('un valor que no es un entero de la tabla (%p) se rechaza con un solo mensaje', async (valor) => {
      expect(await mensajes({ ...maximo, levantarse: valor })).toEqual(['levantarse debe ser uno de los valores permitidos: 0, 1, 2']);
    });

    it.each(ITEMS_TINETTI_V1.map((i) => [i.campo]))('%s es obligatorio (ausente ⇒ 400)', async (campo) => {
      const sin = { ...maximo } as Record<string, unknown>;
      delete sin[campo];
      expect((await mensajes(sin))[0]).toContain(`${campo} debe ser uno de los valores permitidos`);
    });

    it('un cuerpo vacío informa los veinte ítems', async () => {
      expect(await mensajes({})).toHaveLength(20);
    });
  });

  describe('lo que el cliente NO puede enviar', () => {
    it.each([
      'puntajeEquilibrio',
      'puntajeMarcha',
      'puntajeTotal',
      'riesgoCaida',
      'versionInstrumento',
      'edadMomentoEvaluacion',
      'numeroControl',
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
    ])('rechaza %s con 400 (whitelist)', async (campo) => {
      expect((await mensajes({ ...maximo, [campo]: 1 })).join()).toContain(`property ${campo} should not exist`);
    });
  });

  describe('fecha', () => {
    it('acepta YYYY-MM-DD y null (equivale a hoy)', async () => {
      expect(await mensajes({ ...maximo, fecha: '2026-10-21' })).toEqual([]);
      expect(await mensajes({ ...maximo, fecha: null })).toEqual([]);
    });

    it.each(['21/10/2026', '2026-1-1', '2026-10-21T10:00', 'hoy'])('rechaza el formato %p', async (fecha) => {
      expect(await mensajes({ ...maximo, fecha })).toContain('fecha debe tener formato YYYY-MM-DD');
    });
  });

  describe('observaciones (texto libre)', () => {
    it('el vacío se convierte en null; null es válido', async () => {
      expect((await validar({ ...maximo, observaciones: '   ' })).observaciones).toBeNull();
      expect(await mensajes({ ...maximo, observaciones: null })).toEqual([]);
    });

    it('admite texto largo (> 2000 caracteres, CA-06) hasta el máximo y rechaza el exceso', async () => {
      expect(await mensajes({ ...maximo, observaciones: generarTextoLargo(2500) })).toEqual([]);
      expect(await mensajes({ ...maximo, observaciones: generarTextoLargo(MAX_TEXTO_LIBRE) })).toEqual([]);
      expect((await mensajes({ ...maximo, observaciones: generarTextoLargo(MAX_TEXTO_LIBRE + 1) })).join()).toContain(
        'observaciones must be shorter than or equal to',
      );
    });

    it('rechaza lo que no es texto', async () => {
      expect((await mensajes({ ...maximo, observaciones: 123 })).join()).toContain('observaciones must be a string');
    });
  });
});
