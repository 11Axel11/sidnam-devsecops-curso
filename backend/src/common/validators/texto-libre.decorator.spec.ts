import 'reflect-metadata';
import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';
import { TextoObligatorio } from './texto-libre.decorator';

class Ejemplo {
  @TextoObligatorio(10)
  campo: string;
}

// Misma configuración que el ValidationPipe global de main.ts.
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const meta: ArgumentMetadata = { type: 'body', metatype: Ejemplo };
const mensajes = async (valor: unknown): Promise<string[] | 'OK'> => {
  try {
    await pipe.transform(valor, meta);
    return 'OK';
  } catch (e) {
    return ((e as BadRequestException).getResponse() as { message: string[] }).message;
  }
};

describe('TextoObligatorio', () => {
  it('acepta un texto y lo recorta', async () => {
    const r = (await pipe.transform({ campo: '  Asistido  ' }, meta)) as Ejemplo;
    expect(r.campo).toBe('Asistido');
  });

  it('rechaza ausente, vacío, solo espacios y null (a diferencia de TextoCorto, no es opcional)', async () => {
    expect(await mensajes({})).not.toBe('OK');
    expect(await mensajes({ campo: '' })).toContain('campo should not be empty');
    expect(await mensajes({ campo: '   ' })).toContain('campo should not be empty');
    expect(await mensajes({ campo: null })).not.toBe('OK');
  });

  it('rechaza lo que no es texto y lo que pasa del máximo', async () => {
    expect(await mensajes({ campo: 123 })).toContain('campo must be a string');
    expect(await mensajes({ campo: 'x'.repeat(10) })).toBe('OK');
    expect(await mensajes({ campo: 'x'.repeat(11) })).toContain('campo must be shorter than or equal to 10 characters');
  });
});
