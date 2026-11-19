/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return -- mocks de repositorios/guards */
import 'reflect-metadata';
import { ExecutionContext, ForbiddenException, RequestMethod } from '@nestjs/common';
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RolesAccionesGuard } from 'src/modulos/autenticacion/guard/actions.guard';
import { AuthGuard } from 'src/modulos/autenticacion/guard/auth.guard';
import { SeccionGuard } from 'src/modulos/autenticacion/guard/seccion.guard';
import { RolUsuario } from 'src/modulos/gestion-usuario/entities/rol.entity';
import { RolPermisoAccion } from 'src/modulos/gestion-usuario/entities/rolPermisoAccion.entity';
import { FichaResumenController } from './ficha-resumen.controller';

/**
 * 403 reales (RF-TR-02, CA-23, CA-24): el endpoint exige SOLO `FichaResumen:Ver`. Los contextos apuntan al método REAL del
 * controller, así que si alguien quita un decorador de permiso, o pide otra sección, la prueba falla.
 */
describe('Ficha resumen — permiso FichaResumen:Ver', () => {
  let rolesGuard: RolesAccionesGuard;
  let seccionGuard: SeccionGuard;
  let rolRepo: { findOne: jest.Mock };
  let rpaRepo: { findOne: jest.Mock };

  const ctx = (user: any): ExecutionContext =>
    ({
      getHandler: () => (FichaResumenController.prototype as any).obtener,
      getClass: () => FichaResumenController,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  /** Simula la tabla rol–permiso–acción: el rol `permisos` tiene exactamente estas combinaciones sección:acción. */
  const rolConPermisos = (permisos: string[]) => {
    rolRepo.findOne.mockResolvedValue({ id_rol: 9 });
    rpaRepo.findOne.mockImplementation(({ where }: any) => {
      const seccion = where.permiso?.seccion;
      const accion = where.accion?.accion;
      // RolesAccionesGuard pregunta solo por la ACCIÓN (en cualquier sección); SeccionGuard por sección + acción.
      const tiene = seccion === undefined ? permisos.some((p) => p.endsWith(`:${accion}`)) : permisos.includes(`${seccion}:${accion}`);
      return Promise.resolve(tiene ? { id: 1 } : null);
    });
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesAccionesGuard,
        SeccionGuard,
        Reflector,
        { provide: getRepositoryToken(RolPermisoAccion), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(RolUsuario), useValue: { findOne: jest.fn() } },
      ],
    }).compile();
    rolesGuard = module.get(RolesAccionesGuard);
    seccionGuard = module.get(SeccionGuard);
    rpaRepo = module.get(getRepositoryToken(RolPermisoAccion));
    rolRepo = module.get(getRepositoryToken(RolUsuario));
  });

  it('el controller aplica AuthGuard + RolesAccionesGuard + SeccionGuard', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, FichaResumenController)).toEqual([AuthGuard, RolesAccionesGuard, SeccionGuard]);
  });

  it('es SOLO LECTURA: un único endpoint GET en expedientes/:expedienteId/ficha-resumen (sin POST, PATCH ni DELETE)', () => {
    const metodos = Object.getOwnPropertyNames(FichaResumenController.prototype).filter((m) => m !== 'constructor');
    expect(metodos).toEqual(['obtener']);
    const handler = (FichaResumenController.prototype as any).obtener;
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('expedientes/:expedienteId/ficha-resumen');
  });

  it('sin ningún permiso ⇒ 403 (acción y sección)', async () => {
    rolConPermisos([]);
    await expect(rolesGuard.canActivate(ctx({ id: 1, roleId: 9 }))).rejects.toBeInstanceOf(ForbiddenException);
    await expect(seccionGuard.canActivate(ctx({ id: 1, roleId: 9 }))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('CA-24: con TODOS los permisos de Nutricion y TerapiaFisica pero SIN FichaResumen:Ver ⇒ 403', async () => {
    const todas = ['Ver', 'Crear', 'Actualizar', 'Eliminar'];
    rolConPermisos(['Nutricion', 'TerapiaFisica'].flatMap((s) => todas.map((a) => `${s}:${a}`)));
    // RolesAccionesGuard solo mira la acción (el rol tiene «Ver» en otras secciones): lo que cierra el paso es SeccionGuard.
    await expect(seccionGuard.canActivate(ctx({ id: 1, roleId: 9 }))).rejects.toBeInstanceOf(ForbiddenException);
    await expect(seccionGuard.canActivate(ctx({ id: 1, roleId: 9 }))).rejects.toThrow('No tienes acceso a la sección "FichaResumen" con la acción "Ver"');
  });

  it('FichaResumen con otra acción (Crear) pero sin Ver ⇒ 403', async () => {
    rolConPermisos(['FichaResumen:Crear', 'FichaResumen:Actualizar']);
    await expect(seccionGuard.canActivate(ctx({ id: 1, roleId: 9 }))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('CA-23: un rol (Enfermería) SOLO con FichaResumen:Ver ENTRA, sin Nutricion ni TerapiaFisica', async () => {
    rolConPermisos(['FichaResumen:Ver']);
    await expect(rolesGuard.canActivate(ctx({ id: 1, roleId: 9 }))).resolves.toBe(true);
    await expect(seccionGuard.canActivate(ctx({ id: 1, roleId: 9 }))).resolves.toBe(true);
  });

  it('exige exactamente la sección FichaResumen + la acción Ver (y ninguna otra sección)', async () => {
    rolConPermisos(['FichaResumen:Ver']);
    await seccionGuard.canActivate(ctx({ id: 1, roleId: 9 }));
    const consultas = rpaRepo.findOne.mock.calls.map(([o]: any) => o.where);
    expect(consultas.length).toBeGreaterThan(0);
    for (const where of consultas) {
      expect(where.permiso).toEqual({ seccion: 'FichaResumen' });
      expect(where.accion).toEqual({ accion: 'Ver' });
    }
  });

  it('sin usuario o sin rol ⇒ 403 «No autenticado o sin rol»', async () => {
    await expect(seccionGuard.canActivate(ctx(undefined))).rejects.toBeInstanceOf(ForbiddenException);
    await expect(seccionGuard.canActivate(ctx({ id: 1 }))).rejects.toBeInstanceOf(ForbiddenException);
  });
});
