import 'reflect-metadata';
import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';
import { ListarRegistrosDto } from './listar-registros.dto';

// Misma configuración que el ValidationPipe global de main.ts.
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const meta: ArgumentMetadata = { type: 'query', metatype: ListarRegistrosDto };
const validar = (valor: unknown) => pipe.transform(valor, meta) as Promise<ListarRegistrosDto>;
const mensajes = async (valor: unknown): Promise<string[]> => {
  try {
    await validar(valor);
    return [];
  } catch (e) {
    return ((e as BadRequestException).getResponse() as { message: string[] }).message;
  }
};

describe('ListarRegistrosDto (filtros de los listados)', () => {
  it('todo es opcional', async () => {
    expect(await validar({})).toEqual({});
  });

  it('acepta desde, hasta e incluirAnulados como llegan en un query string', async () => {
    const r = await validar({ desde: '2026-01-01', hasta: '2026-12-31', incluirAnulados: 'true' });
    expect(r).toEqual({ desde: '2026-01-01', hasta: '2026-12-31', incluirAnulados: true });
  });

  it('"false" se convierte en false (no en true)', async () => {
    expect((await validar({ incluirAnulados: 'false' })).incluirAnulados).toBe(false);
  });

  it('rechaza fechas con otro formato', async () => {
    expect(await mensajes({ desde: '01/01/2026' })).toContain('desde debe tener formato YYYY-MM-DD');
    expect(await mensajes({ hasta: '2026-1-1' })).toContain('hasta debe tener formato YYYY-MM-DD');
  });

  it('rechaza un booleano que no es true/false', async () => {
    expect(await mensajes({ incluirAnulados: 'si' })).toContain('incluirAnulados must be a boolean value');
  });

  it('rechaza parámetros que no existen', async () => {
    expect((await mensajes({ orden: 'asc' })).join()).toMatch(/property orden should not exist/);
  });
});
