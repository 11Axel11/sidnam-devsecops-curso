import 'reflect-metadata';
import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';
import { ItemDeInstrumento, ItemDeInstrumentoOpcional } from './item-instrumento.decorator';

class Ejemplo {
  @ItemDeInstrumento([10, 5, 0])
  comer: number;

  @ItemDeInstrumento([1, 0])
  sentado: number;
}

// Misma configuración que el ValidationPipe global de main.ts.
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const meta: ArgumentMetadata = { type: 'body', metatype: Ejemplo };
const mensajes = async (valor: unknown): Promise<string[]> => {
  try {
    await pipe.transform(valor, meta);
    return [];
  } catch (e) {
    return ((e as BadRequestException).getResponse() as { message: string[] }).message;
  }
};

describe('ItemDeInstrumento (valores discretos de un instrumento clínico)', () => {
  it.each([10, 5, 0])('acepta el valor permitido %p', async (v) => {
    expect(await mensajes({ comer: v, sentado: 1 })).toEqual([]);
  });

  it.each([7, 15, -5, 1, 11])('rechaza el entero %p que está fuera de la lista (aunque esté dentro del rango)', async (v) => {
    expect(await mensajes({ comer: v, sentado: 1 })).toEqual(['comer debe ser uno de los valores permitidos: 10, 5, 0']);
  });

  it.each([5.5, '5', '', null, true, [5], {}, Number.NaN])('rechaza %p con UN solo mensaje', async (v) => {
    expect(await mensajes({ comer: v, sentado: 1 })).toEqual(['comer debe ser uno de los valores permitidos: 10, 5, 0']);
  });

  it('es obligatorio: ausente se rechaza', async () => {
    expect(await mensajes({ sentado: 1 })).toEqual(['comer debe ser uno de los valores permitidos: 10, 5, 0']);
  });

  it('informa cada campo con su propia lista', async () => {
    expect(await mensajes({ comer: 3, sentado: 2 })).toEqual([
      'comer debe ser uno de los valores permitidos: 10, 5, 0',
      'sentado debe ser uno de los valores permitidos: 1, 0',
    ]);
  });
});

describe('ItemDeInstrumentoOpcional (omisible, con decimales)', () => {
  class Opcional {
    @ItemDeInstrumentoOpcional([0, 0.5, 1])
    itemK?: number | null;
  }
  const metaOpc: ArgumentMetadata = { type: 'body', metatype: Opcional };
  const mensajesOpc = async (valor: unknown): Promise<string[]> => {
    try {
      await pipe.transform(valor, metaOpc);
      return [];
    } catch (e) {
      return ((e as BadRequestException).getResponse() as { message: string[] }).message;
    }
  };

  it.each([0, 0.5, 1, 1.0])('acepta el valor permitido %p (incluido el medio punto)', async (v) => {
    expect(await mensajesOpc({ itemK: v })).toEqual([]);
  });

  it('ausente y null se aceptan en el formato (la obligatoriedad la decide el servicio)', async () => {
    expect(await mensajesOpc({})).toEqual([]);
    expect(await mensajesOpc({ itemK: null })).toEqual([]);
  });

  it.each([0.3, 0.75, 1.5, 2, -0.5, '0.5', '', true])('rechaza %p con un solo mensaje', async (v) => {
    expect(await mensajesOpc({ itemK: v })).toEqual(['itemK debe ser uno de los valores permitidos: 0, 0.5, 1']);
  });
});
