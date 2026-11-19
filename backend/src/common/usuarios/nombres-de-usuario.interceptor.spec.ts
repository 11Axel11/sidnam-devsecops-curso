/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- respuestas JSON sin tipar */
import { CallHandler, ExecutionContext, StreamableFile } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { lastValueFrom, of, throwError } from 'rxjs';
import { Readable } from 'stream';
import { NombresDeUsuarioInterceptor } from './nombres-de-usuario.interceptor';

/**
 * El interceptor resuelve los nombres con UNA consulta por petición, deja pasar sin tocar lo que no es un objeto o
 * arreglo de datos (p. ej. el PDF de BE-8) y no pierde una respuesta ya calculada si falla la consulta de nombres.
 */
const contexto = {} as ExecutionContext;
const handler = (valor: unknown): CallHandler => ({ handle: () => of(valor) });

const montar = (usuarios: { id: number; name: string; apellido1: string; apellido2?: string | null }[], fallar = false) => {
  const find = jest.fn(({ where }: { where: { id: { value: number[] } } }) => {
    if (fallar) return Promise.reject(new Error('base caída'));
    return Promise.resolve(usuarios.filter((u) => where.id.value.includes(u.id)));
  });
  const dataSource = { getRepository: jest.fn(() => ({ find })) } as unknown as DataSource;
  return { interceptor: new NombresDeUsuarioInterceptor(dataSource), find };
};
const correr = (i: NombresDeUsuarioInterceptor, valor: unknown): Promise<any> => lastValueFrom(i.intercept(contexto, handler(valor)));
const KARINA = { id: 5, name: 'Karina', apellido1: 'Mora', apellido2: 'Díaz' };
const ELENA = { id: 6, name: 'Elena', apellido1: 'Rojas', apellido2: null };

describe('NombresDeUsuarioInterceptor', () => {
  it('un listado de 50 filas con ids repetidos hace UNA sola consulta de usuarios', async () => {
    const { interceptor, find } = montar([KARINA, ELENA]);
    const filas = Array.from({ length: 50 }, (_, i) => ({ id: i + 1, creadoPorId: 5, modificadoPorId: i % 2 ? 6 : null, usuarioResponsableId: 5 }));
    const r = await correr(interceptor, filas);
    expect(find).toHaveBeenCalledTimes(1);
    expect(r).toHaveLength(50);
    expect(r[0]).toMatchObject({ creadoPorNombre: 'Karina Mora Díaz', modificadoPorNombre: null, usuarioResponsableNombre: 'Karina Mora Díaz' });
    expect(r[1]).toMatchObject({ modificadoPorNombre: 'Elena Rojas' });
  });

  it('una respuesta con hijos anidados también cuesta UNA consulta', async () => {
    const { interceptor, find } = montar([KARINA, ELENA]);
    const r = await correr(interceptor, { id: 1, creadoPorId: 5, antecedentesPersonales: [{ creadoPorId: 6 }, { creadoPorId: 5 }], antecedentesTraumaticos: [{ anuladoPorId: 6 }] });
    expect(find).toHaveBeenCalledTimes(1);
    expect(r.antecedentesTraumaticos[0].anuladoPorNombre).toBe('Elena Rojas');
  });

  it('sin ids de usuario NO consulta nada y devuelve la misma respuesta', async () => {
    const { interceptor, find } = montar([KARINA]);
    const vista = { subtotalCribaje: 9, segundaParte: { requerida: true } }; // p. ej. la vista previa del MNA
    expect(await correr(interceptor, vista)).toBe(vista);
    const vacio: unknown[] = [];
    expect(await correr(interceptor, vacio)).toBe(vacio);
    expect(find).not.toHaveBeenCalled();
  });

  it('un usuario inexistente se resuelve a null sin romper la respuesta', async () => {
    const { interceptor } = montar([KARINA]);
    expect(await correr(interceptor, { creadoPorId: 999 })).toEqual({ creadoPorId: 999, creadoPorNombre: null });
  });

  describe('lo que NO es un objeto o arreglo de datos pasa SIN TOCAR (BE-8 devolverá un PDF)', () => {
    const pdf = Buffer.from('%PDF-1.7');
    const archivo = new StreamableFile(Buffer.from('%PDF'));
    const stream = Readable.from(['x']);
    it.each([
      ['Buffer (PDF)', pdf],
      ['StreamableFile', archivo],
      ['stream', stream],
      ['string', 'texto'],
      ['null', null],
      ['undefined', undefined],
      ['número', 7],
    ])('%s: misma referencia y ninguna consulta', async (_n, valor) => {
      const { interceptor, find } = montar([KARINA]);
      expect(await correr(interceptor, valor)).toBe(valor);
      expect(find).not.toHaveBeenCalled();
    });
  });

  it('si la consulta de nombres falla, la respuesta NO se pierde: sale con los nombres en null', async () => {
    const { interceptor } = montar([KARINA], true);
    const r = await correr(interceptor, { id: 1, creadoPorId: 5 });
    expect(r).toEqual({ id: 1, creadoPorId: 5, creadoPorNombre: null });
  });

  it('un error del handler pasa tal cual (el interceptor no lo oculta ni consulta nada)', async () => {
    const { interceptor, find } = montar([KARINA]);
    const falla: CallHandler = { handle: () => throwError(() => new Error('409 de negocio')) };
    await expect(lastValueFrom(interceptor.intercept(contexto, falla))).rejects.toThrow('409 de negocio');
    expect(find).not.toHaveBeenCalled();
  });
});
