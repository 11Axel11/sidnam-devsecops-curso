/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/require-await, @typescript-eslint/no-unsafe-return -- mocks de repositorios/guards */
import { ConflictException, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { CatalogoService } from './catalogo.service';

/** Repo en memoria suficiente para el servicio (find/findOne/create/save). */
const buildRepo = (filas: any[] = []) => {
  const repo: any = {
    filas,
    find: jest.fn(async ({ where }: any) => repo.filas.filter((f: any) => where.activo === undefined || f.activo === where.activo)),
    findOne: jest.fn(async ({ where }: any) =>
      repo.filas.find((f: any) =>
        where.id !== undefined ? f.id === where.id : f.nombre.toLowerCase() === String(where.nombre).toLowerCase(),
      ) ?? null,
    ),
    create: jest.fn((d: any) => ({ ...d })),
    save: jest.fn(async (e: any) => {
      if (!e.id) { e.id = repo.filas.length + 1; repo.filas.push(e); }
      return e;
    }),
  };
  return repo;
};

describe('CatalogoService (catálogos administrables, RF-TR-03)', () => {
  describe('listar', () => {
    it('por defecto solo activos; soloActivos=false incluye inactivos', async () => {
      const repo = buildRepo([
        { id: 1, nombre: 'A', activo: true },
        { id: 2, nombre: 'B', activo: false },
      ]);
      const svc = new CatalogoService(repo, 'Test');
      expect((await svc.listar()).map((f: any) => f.id)).toEqual([1]);
      expect((await svc.listar(false)).map((f: any) => f.id)).toEqual([1, 2]);
    });
  });

  describe('crear', () => {
    it('crea activo, recorta espacios y estampa creadoPorId desde el usuario (nunca del body)', async () => {
      const repo = buildRepo();
      const svc = new CatalogoService(repo, 'Test');
      const r: any = await svc.crear('  Diabetes mellitus  ', 42);
      expect(r).toMatchObject({ nombre: 'Diabetes mellitus', activo: true, creadoPorId: 42 });
      expect(r.modificadoPorId).toBeUndefined();
    });

    it('nombre repetido (sin importar mayúsculas) -> 409', async () => {
      const repo = buildRepo([{ id: 1, nombre: 'Asma', activo: true }]);
      await expect(new CatalogoService(repo, 'Test').crear('ASMA', 1)).rejects.toBeInstanceOf(ConflictException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('si existe pero está desactivado, el 409 sugiere reactivar', async () => {
      const repo = buildRepo([{ id: 1, nombre: 'Asma', activo: false }]);
      await expect(new CatalogoService(repo, 'Test').crear('Asma', 1)).rejects.toThrow(/reactív/i);
    });

    it('carrera: el índice único gana (ER_DUP_ENTRY en el save) -> 409, no 500', async () => {
      const repo = buildRepo();
      repo.save.mockRejectedValueOnce(
        new QueryFailedError('INSERT', [], Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY', errno: 1062 }) as any),
      );
      await expect(new CatalogoService(repo, 'Test').crear('Nuevo', 1)).rejects.toBeInstanceOf(ConflictException);
    });

    it('otros errores de base se propagan tal cual', async () => {
      const repo = buildRepo();
      repo.save.mockRejectedValueOnce(new Error('boom'));
      await expect(new CatalogoService(repo, 'Test').crear('Nuevo', 1)).rejects.toThrow('boom');
    });
  });

  describe('desactivar / reactivar (soft-delete)', () => {
    it('desactivar NO borra la fila: queda activo=false y modificadoPorId del usuario', async () => {
      const repo = buildRepo([{ id: 5, nombre: 'Asma', activo: true, creadoPorId: 1 }]);
      const svc = new CatalogoService(repo, 'Test');
      const r: any = await svc.desactivar(5, 9);
      expect(r).toMatchObject({ id: 5, activo: false, modificadoPorId: 9, creadoPorId: 1 });
      expect(repo.filas).toHaveLength(1); // sigue existiendo para los históricos
      expect((await svc.listar()).find((f: any) => f.id === 5)).toBeUndefined(); // ya no se ofrece
      expect((await svc.listar(false)).find((f: any) => f.id === 5)).toBeDefined(); // pero se resuelve
    });

    it('reactivar revierte el soft-delete', async () => {
      const repo = buildRepo([{ id: 5, nombre: 'Asma', activo: false }]);
      const r: any = await new CatalogoService(repo, 'Test').reactivar(5, 9);
      expect(r).toMatchObject({ activo: true, modificadoPorId: 9 });
    });

    it('es idempotente: no vuelve a guardar ni audita si ya está en ese estado', async () => {
      const repo = buildRepo([{ id: 5, nombre: 'Asma', activo: false }]);
      await new CatalogoService(repo, 'Test').desactivar(5, 9);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('id inexistente -> 404', async () => {
      const svc = new CatalogoService(buildRepo(), 'Test');
      await expect(svc.desactivar(99, 1)).rejects.toBeInstanceOf(NotFoundException);
      await expect(svc.reactivar(99, 1)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  it('no expone ninguna operación de borrado físico', () => {
    const metodos = Object.getOwnPropertyNames(CatalogoService.prototype);
    expect(metodos.filter((m) => /elimin|delete|remove|borrar/i.test(m))).toEqual([]);
  });
});
