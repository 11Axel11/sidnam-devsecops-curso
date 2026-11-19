/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- mocks de repositorios/guards */
import 'reflect-metadata';
import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';
import { CrearCatalogoDto, ListarCatalogoDto } from './catalogo.dto';

// Misma configuración que el ValidationPipe global de main.ts.
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const meta = (metatype: any, type: 'body' | 'query'): ArgumentMetadata => ({ type, metatype });

describe('DTOs de catálogos', () => {
  it('POST: recorta el nombre', async () => {
    const r: any = await pipe.transform({ nombre: '  Asma ' }, meta(CrearCatalogoDto, 'body'));
    expect(r.nombre).toBe('Asma');
  });

  it.each([[{}], [{ nombre: '' }], [{ nombre: '   ' }], [{ nombre: 'x'.repeat(151) }]])(
    'POST: rechaza nombre inválido %j',
    async (body) => {
      await expect(pipe.transform(body, meta(CrearCatalogoDto, 'body'))).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it.each([['creadoPorId'], ['modificadoPorId'], ['activo'], ['id']])(
    'POST: rechaza %s en el body (la auditoría sale del token)',
    async (campo) => {
      await expect(
        pipe.transform({ nombre: 'X', [campo]: 1 }, meta(CrearCatalogoDto, 'body')),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  describe('GET soloActivos (el string "false" debe ser false, no true)', () => {
    it.each([
      ['true', true],
      ['false', false],
    ])('"%s" -> %s', async (entrada, esperado) => {
      const r: any = await pipe.transform({ soloActivos: entrada }, meta(ListarCatalogoDto, 'query'));
      expect(r.soloActivos).toBe(esperado);
    });

    it('omitido queda undefined (el controller aplica el default true)', async () => {
      const r: any = await pipe.transform({}, meta(ListarCatalogoDto, 'query'));
      expect(r.soloActivos).toBeUndefined();
    });

    it('valor basura -> 400', async () => {
      await expect(pipe.transform({ soloActivos: 'quizas' }, meta(ListarCatalogoDto, 'query'))).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });
});
