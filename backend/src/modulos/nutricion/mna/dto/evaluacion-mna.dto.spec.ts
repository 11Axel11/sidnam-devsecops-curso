import 'reflect-metadata';
import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';
import { puntosPermitidos } from 'src/common/valoraciones/instrumento';
import { ITEMS_MNA_V1 } from '../mna-v1.instrumento';
import { EvaluacionesMnaController } from '../evaluaciones-mna.controller';
import { CrearEvaluacionMnaDto } from './evaluacion-mna.dto';

// Misma configuración que el ValidationPipe global de main.ts.
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const meta: ArgumentMetadata = { type: 'body', metatype: CrearEvaluacionMnaDto };
const validar = (valor: unknown) => pipe.transform(valor, meta) as Promise<CrearEvaluacionMnaDto>;
const mensajes = async (valor: unknown): Promise<string[]> => {
  try {
    await validar(valor);
    return [];
  } catch (e) {
    return ((e as BadRequestException).getResponse() as { message: string[] }).message;
  }
};
const permitidos = (campo: string): number[] => puntosPermitidos(ITEMS_MNA_V1.find((i) => i.campo === campo)!);
const maximo = (campo: string) => Math.max(...permitidos(campo));
const CAMPOS = ITEMS_MNA_V1.map((i) => i.campo);
const cribaje = Object.fromEntries(['itemA', 'itemB', 'itemC', 'itemD', 'itemE', 'itemF'].map((c) => [c, maximo(c)]));
const evaluacion = Object.fromEntries(CAMPOS.slice(6).map((c) => [c, maximo(c)]));
const completo = { ...cribaje, ...evaluacion };

describe('CrearEvaluacionMnaDto (RF-NU-03; mismo DTO del registro y de la vista previa)', () => {
  it('acepta los dieciocho ítems', async () => {
    expect(await mensajes(completo)).toEqual([]);
  });

  it('acepta solo el cribaje A–F (la regla de la segunda parte la aplica el servicio)', async () => {
    expect(await mensajes(cribaje)).toEqual([]);
  });

  it('acepta el cribaje sin itemF cuando se vincula un control', async () => {
    const { itemF, ...sinF } = cribaje;
    void itemF;
    expect(await mensajes({ ...sinF, controlNutricionalId: 12 })).toEqual([]);
  });

  it('acepta fecha, vínculo y null en los ítems omisibles (F, G–R)', async () => {
    const nulos = Object.fromEntries(CAMPOS.slice(5).map((c) => [c, null]));
    expect(await mensajes({ ...cribaje, ...nulos, fecha: '2026-10-21', controlNutricionalId: null })).toEqual([]);
  });

  describe('cada ítem admite SOLO los valores discretos del Anexo D (con medios puntos)', () => {
    it.each(CAMPOS.map((c) => [c]))('%s: acepta cada valor permitido y rechaza cualquier otro en pasos de 0,5 de -1 a 4', async (campo) => {
      const ok = permitidos(campo);
      for (let v = -1; v <= 4; v += 0.5) {
        const m = await mensajes({ ...completo, [campo]: v });
        if (ok.includes(v)) expect(m).toEqual([]);
        else expect(m).toEqual([`${campo} debe ser uno de los valores permitidos: ${ok.join(', ')}`]);
      }
    });

    it.each([
      ['itemD', 1],
      ['itemB', 4],
      ['itemK', 0.3],
      ['itemK', 2],
      ['itemM', 1.5],
      ['itemP', 3],
      ['itemQ', 2], // el valor erróneo de la hoja física (decisión P2): rompería el máximo de 16
      ['itemR', 0.5],
    ])('ejemplos: %s = %p', async (campo, valor) => {
      expect((await mensajes({ ...completo, [campo]: valor }))[0]).toContain(`${campo} debe ser uno de los valores permitidos`);
    });

    it.each(['1', '', true, [1], {}, Number.NaN])('un valor que no es un número de la tabla (%p) se rechaza con un solo mensaje', async (valor) => {
      expect(await mensajes({ ...completo, itemC: valor })).toEqual(['itemC debe ser uno de los valores permitidos: 0, 1, 2']);
    });

    it.each(['itemA', 'itemB', 'itemC', 'itemD', 'itemE'])('%s es obligatorio y no admite null', async (campo) => {
      const sin = { ...completo } as Record<string, unknown>;
      delete sin[campo];
      expect((await mensajes(sin))[0]).toContain(`${campo} debe ser uno de los valores permitidos`);
      expect((await mensajes({ ...completo, [campo]: null }))[0]).toContain(`${campo} debe ser uno de los valores permitidos`);
    });
  });

  describe('controlNutricionalId y fecha', () => {
    it.each([0, -1, 1.5, '3', true])('controlNutricionalId %p se rechaza', async (v) => {
      expect((await mensajes({ ...completo, controlNutricionalId: v })).join()).toContain('controlNutricionalId');
    });

    it.each(['21/10/2026', '2026-1-1', '2026-10-21T10:00', 'hoy'])('rechaza la fecha %p', async (fecha) => {
      expect(await mensajes({ ...completo, fecha })).toContain('fecha debe tener formato YYYY-MM-DD');
    });
  });

  describe('lo que el cliente NO puede enviar', () => {
    it.each([
      'subtotalCribaje',
      'interpretacionCribaje',
      'subtotalEvaluacion',
      'evaluacionGlobal',
      'interpretacionGlobal',
      'versionInstrumento',
      'usuarioResponsableId',
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
      'observaciones',
    ])('rechaza %s con 400 (whitelist)', async (campo) => {
      expect((await mensajes({ ...completo, [campo]: 1 })).join()).toContain(`property ${campo} should not exist`);
    });
  });

  it('la vista previa (POST …/calcular) y el registro (POST …/evaluaciones-mna) validan con el MISMO DTO: un valor fuera de tabla es 400 en ambos', () => {
    const tipos = (metodo: 'calcular' | 'crear'): unknown[] =>
      (Reflect.getMetadata('design:paramtypes', EvaluacionesMnaController.prototype, metodo) as unknown[] | undefined) ?? [];
    expect(tipos('calcular')).toContain(CrearEvaluacionMnaDto);
    expect(tipos('crear')).toContain(CrearEvaluacionMnaDto);
  });
});
