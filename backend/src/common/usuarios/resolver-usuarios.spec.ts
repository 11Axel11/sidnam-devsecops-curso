import { FindOperator } from 'typeorm';
import { Usuario } from 'src/modulos/gestion-usuario/entities/usuario.entity';
import { nombreCompleto, OrigenDeConsulta, resolverUsuarios } from './resolver-usuarios';

/**
 * CA-26: el nombre del usuario se resuelve en UNA consulta, sin datos sensibles, también para usuarios inactivos o
 * eliminados (histórico).
 */
type FilaUsuario = Pick<Usuario, 'id' | 'name' | 'apellido1' | 'apellido2'>;

const origen = (filas: FilaUsuario[]) => {
  const find = jest.fn((opciones: { where: { id: FindOperator<number> } }) => {
    const pedidos = opciones.where.id.value as unknown as number[];
    return Promise.resolve(filas.filter((f) => pedidos.includes(f.id)));
  });
  const getRepository = jest.fn(() => ({ find }));
  return { origen: { getRepository } as unknown as OrigenDeConsulta, find, getRepository };
};

const KARINA: FilaUsuario = { id: 5, name: 'Karina', apellido1: 'Mora', apellido2: 'Díaz' };
const ELENA: FilaUsuario = { id: 6, name: 'Elena', apellido1: 'Rojas', apellido2: null as unknown as string };

describe('nombreCompleto', () => {
  it('«Nombre Apellido1 Apellido2»', () => {
    expect(nombreCompleto(KARINA)).toBe('Karina Mora Díaz');
  });

  it('sin segundo apellido (null, vacío o en blanco) no deja espacios de más', () => {
    expect(nombreCompleto(ELENA)).toBe('Elena Rojas');
    expect(nombreCompleto({ name: 'Elena', apellido1: 'Rojas', apellido2: '' })).toBe('Elena Rojas');
    expect(nombreCompleto({ name: ' Elena ', apellido1: 'Rojas', apellido2: '   ' })).toBe('Elena Rojas');
  });

  it('sin ninguna parte utilizable ⇒ null', () => {
    expect(nombreCompleto({ name: '', apellido1: '  ', apellido2: null as unknown as string })).toBeNull();
  });
});

describe('resolverUsuarios', () => {
  it('resuelve varios ids en UNA sola consulta', async () => {
    const { origen: o, find, getRepository } = origen([KARINA, ELENA]);
    const mapa = await resolverUsuarios(o, [5, 6]);
    expect(find).toHaveBeenCalledTimes(1);
    expect(getRepository).toHaveBeenCalledWith(Usuario);
    expect(mapa).toEqual(
      new Map([
        [5, 'Karina Mora Díaz'],
        [6, 'Elena Rojas'],
      ]),
    );
  });

  it('ids repetidos: se consultan una sola vez cada uno', async () => {
    const { origen: o, find } = origen([KARINA]);
    await resolverUsuarios(o, [5, 5, 5, 5]);
    expect(find).toHaveBeenCalledTimes(1);
    const where = (find.mock.calls[0][0] as { where: { id: FindOperator<number> } }).where.id;
    expect(where.value).toEqual([5]);
  });

  it('null y undefined se ignoran', async () => {
    const { origen: o, find } = origen([KARINA]);
    const mapa = await resolverUsuarios(o, [null, 5, undefined, null]);
    expect(find).toHaveBeenCalledTimes(1);
    expect([...mapa.keys()]).toEqual([5]);
  });

  it('sin ids utilizables NO consulta nada', async () => {
    const { origen: o, find, getRepository } = origen([KARINA]);
    expect(await resolverUsuarios(o, [])).toEqual(new Map());
    expect(await resolverUsuarios(o, [null, undefined])).toEqual(new Map());
    expect(find).not.toHaveBeenCalled();
    expect(getRepository).not.toHaveBeenCalled();
  });

  it('un usuario que no existe no aparece en el mapa (quien mapea lo trata como null)', async () => {
    const { origen: o } = origen([KARINA]);
    const mapa = await resolverUsuarios(o, [5, 999]);
    expect(mapa.has(999)).toBe(false);
    expect(mapa.get(5)).toBe('Karina Mora Díaz');
  });

  it('pide los usuarios borrados lógicamente (withDeleted) para que el histórico se resuelva, e inactivos se leen igual', async () => {
    const { origen: o, find } = origen([KARINA]);
    await resolverUsuarios(o, [5]);
    expect(find.mock.calls[0][0]).toMatchObject({ withDeleted: true });
  });

  it('pide ÚNICAMENTE id, name, apellido1 y apellido2: nada sensible (cédula, correo, contraseña, token, rol, imagen)', async () => {
    const { origen: o, find } = origen([KARINA]);
    await resolverUsuarios(o, [5]);
    const { select } = find.mock.calls[0][0] as unknown as { select: Record<string, boolean> };
    expect(select).toEqual({ id: true, name: true, apellido1: true, apellido2: true });
    for (const sensible of ['cedula', 'email', 'password', 'refreshToken', 'imagenUrl', 'rol', 'estado']) {
      expect(select).not.toHaveProperty(sensible);
    }
  });

  it('un usuario sin nombre utilizable se mapea a null', async () => {
    const { origen: o } = origen([{ id: 7, name: '', apellido1: '', apellido2: '' }]);
    expect((await resolverUsuarios(o, [7])).get(7)).toBeNull();
  });
});
