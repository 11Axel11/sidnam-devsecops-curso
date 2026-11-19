import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PermisosInventarioService } from './permisosInventario.service';
import { CategoriasPrincipalesProductos as Cat } from 'src/common/enums/categoriasPrincipalesProductos.enum';

describe('PermisosInventarioService — mismos permisos que en Hogar, sin depender de la sede', () => {
  // Tabla de permisos del rol simulado: "seccion:accion"
  const build = (permisos: string[], opts: { rol?: boolean; productos?: Record<number, Cat> } = {}) => {
    const rpaRepo = {
      findOne: jest.fn().mockImplementation(({ where }: any) => {
        const secciones: string[] = where.permiso.seccion.value;
        const acciones: string[] = where.accion.accion.value;
        const ok = secciones.some((s) => acciones.some((a) => permisos.includes(`${s}:${a}`)));
        return Promise.resolve(ok ? { id: 1 } : null);
      }),
    };
    const rolRepo = { findOne: jest.fn().mockResolvedValue(opts.rol === false ? null : { id_rol: 5 }) };
    const productos = opts.productos ?? {};
    const inventarioRepo = {
      findOne: jest.fn().mockImplementation(({ where }: any) =>
        Promise.resolve(productos[where.id] ? { id: where.id, producto: { categoriaTipo: productos[where.id] } } : null),
      ),
      find: jest.fn().mockImplementation(({ where }: any) =>
        Promise.resolve(
          (where.id.value as number[])
            .filter((id) => productos[id])
            .map((id) => ({ id, producto: { categoriaTipo: productos[id] } })),
        ),
      ),
    };
    const productoRepo = {
      findOne: jest.fn().mockImplementation(({ where }: any) =>
        Promise.resolve(productos[where.id] ? { id: where.id, categoriaTipo: productos[where.id] } : null),
      ),
    };
    const svc = new PermisosInventarioService(rpaRepo as any, rolRepo as any, inventarioRepo as any, productoRepo as any);
    return { svc, rpaRepo, rolRepo };
  };

  describe('falla cerrado', () => {
    it('sin roleId -> 403 sin consultar la base', async () => {
      const { svc, rolRepo, rpaRepo } = build(['Alimentos:Crear']);
      await expect(svc.exigirCategoria(undefined, Cat.ALIMENTOS, ['Crear'])).rejects.toBeInstanceOf(ForbiddenException);
      expect(rolRepo.findOne).not.toHaveBeenCalled();
      expect(rpaRepo.findOne).not.toHaveBeenCalled();
    });

    it('rol inexistente o revocado -> 403', async () => {
      const { svc } = build(['Alimentos:Crear'], { rol: false });
      await expect(svc.exigirCategoria(5, Cat.ALIMENTOS, ['Crear'])).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('la sección sale de la categoría, no de la sede', () => {
    it('Alimentos:Crear permite crear en Alimentos, pero NO en Limpieza ni Medicamentos', async () => {
      const { svc } = build(['Alimentos:Crear']);
      await expect(svc.exigirCategoria(5, Cat.ALIMENTOS, ['Crear'])).resolves.toBeUndefined();
      await expect(svc.exigirCategoria(5, Cat.LIMPIEZA, ['Crear'])).rejects.toBeInstanceOf(ForbiddenException);
      await expect(svc.exigirCategoria(5, Cat.MEDICAMENTOS, ['Crear'])).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('la acción importa: Ver no permite Crear', async () => {
      const { svc } = build(['Alimentos:Ver']);
      await expect(svc.exigirCategoria(5, Cat.ALIMENTOS, ['Ver'])).resolves.toBeUndefined();
      await expect(svc.exigirCategoria(5, Cat.ALIMENTOS, ['Crear'])).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('exigirParaExistencia usa la categoría guardada del producto', async () => {
      const { svc } = build(['Medicamentos:Ver'], { productos: { 10: Cat.MEDICAMENTOS, 11: Cat.ALIMENTOS } });
      await expect(svc.exigirParaExistencia(5, 10, ['Ver'])).resolves.toBeUndefined();
      await expect(svc.exigirParaExistencia(5, 11, ['Ver'])).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('seccionesExtra (p. ej. Salidas) amplía dónde se acepta el permiso', async () => {
      const { svc } = build(['Salidas:Ver'], { productos: { 11: Cat.ALIMENTOS } });
      await expect(svc.exigirParaExistencia(5, 11, ['Ver'])).rejects.toBeInstanceOf(ForbiddenException);
      await expect(svc.exigirParaExistencia(5, 11, ['Ver'], ['Salidas'])).resolves.toBeUndefined();
    });

    it('archivar acepta Actualizar o Eliminar', async () => {
      const { svc } = build(['Limpieza:Eliminar'], { productos: { 12: Cat.LIMPIEZA } });
      await expect(svc.exigirParaExistencia(5, 12, ['Actualizar', 'Eliminar'])).resolves.toBeUndefined();
    });

    it('existencia inexistente -> 404', async () => {
      const { svc } = build(['Alimentos:Ver']);
      await expect(svc.exigirParaExistencia(5, 999, ['Ver'])).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('lotes y listados', () => {
    it('un lote debe estar permitido en TODAS las categorías que toca', async () => {
      const { svc } = build(['Alimentos:Crear'], { productos: { 1: Cat.ALIMENTOS, 2: Cat.LIMPIEZA } });
      await expect(svc.exigirParaExistencias(5, [1], ['Crear'])).resolves.toBeUndefined();
      await expect(svc.exigirParaExistencias(5, [1, 2], ['Crear'])).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lote con una existencia inexistente -> 404', async () => {
      const { svc } = build(['Alimentos:Crear'], { productos: { 1: Cat.ALIMENTOS } });
      await expect(svc.exigirParaExistencias(5, [1, 77], ['Crear'])).rejects.toBeInstanceOf(NotFoundException);
    });

    it('categoriasPermitidas devuelve solo las categorías con permiso de Ver', async () => {
      const { svc } = build(['Alimentos:Ver', 'Medicamentos:Ver', 'Limpieza:Crear']);
      expect(await svc.categoriasPermitidas(5, ['Ver'])).toEqual([Cat.ALIMENTOS, Cat.MEDICAMENTOS]);
    });
  });
});
