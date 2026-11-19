import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListarExistenciasDto } from './listarExistenciasDto';

// Regresión: con @Type(() => Boolean), "false" (string del query) se
// convertía en true y el listado devolvía lo contrario a lo pedido.
describe('ListarExistenciasDto — query string', () => {
  it('?archivado=false -> false', () => {
    const dto = plainToInstance(ListarExistenciasDto, { sede: 'hogar', archivado: 'false' });
    expect(dto.archivado).toBe(false);
  });

  it('?archivado=true -> true', () => {
    const dto = plainToInstance(ListarExistenciasDto, { sede: 'hogar', archivado: 'true' });
    expect(dto.archivado).toBe(true);
  });

  it('archivado omitido -> undefined (sin filtro)', () => {
    const dto = plainToInstance(ListarExistenciasDto, { sede: 'hogar' });
    expect(dto.archivado).toBeUndefined();
  });

  it('?archivado=banana -> error de validación (400)', async () => {
    const dto = plainToInstance(ListarExistenciasDto, { sede: 'hogar', archivado: 'banana' });
    const errores = await validate(dto);
    expect(errores.some((e) => e.property === 'archivado')).toBe(true);
  });

  it('sede ausente -> error de validación (400)', async () => {
    const dto = plainToInstance(ListarExistenciasDto, {});
    const errores = await validate(dto);
    expect(errores.some((e) => e.property === 'sede')).toBe(true);
  });
});
