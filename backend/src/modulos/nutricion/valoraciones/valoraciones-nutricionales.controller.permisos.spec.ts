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
import { ValoracionesNutricionalesController } from './valoraciones-nutricionales.controller';

/**
 * 403 reales: los contextos apuntan a los MÉTODOS REALES del controller, así que si alguien quita un
 * decorador de permiso, el test falla.
 */
describe('Valoración nutricional — permisos Nutricion:<acción>', () => {
  let rolesGuard: RolesAccionesGuard;
  let seccionGuard: SeccionGuard;
  let rolRepo: { findOne: jest.Mock };
  let rpaRepo: { findOne: jest.Mock };

  const ctx = (metodo: string, user: any): ExecutionContext =>
    ({
      getHandler: () => (ValoracionesNutricionalesController.prototype as any)[metodo],
      getClass: () => ValoracionesNutricionalesController,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

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

  // [método del controller, acción exigida]
  const endpoints = [
    ['listar', 'Ver'],
    ['vigente', 'Ver'],
    ['detalle', 'Ver'],
    ['crear', 'Crear'],
    ['actualizar', 'Actualizar'],
    ['confirmar', 'Actualizar'], // confirmar/anular = Actualizar
    ['anular', 'Actualizar'],
  ] as const;

  it('el controller aplica AuthGuard + RolesAccionesGuard + SeccionGuard', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, ValoracionesNutricionalesController)).toEqual([
      AuthGuard,
      RolesAccionesGuard,
      SeccionGuard,
    ]);
  });

  describe.each(endpoints)('%s (exige %s)', (metodo, accion) => {
    it('403 si el rol no tiene el permiso', async () => {
      rolRepo.findOne.mockResolvedValue({ id_rol: 3 });
      rpaRepo.findOne.mockResolvedValue(null);
      const c = ctx(metodo, { id: 1, roleId: 3 });
      await expect(rolesGuard.canActivate(c)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(seccionGuard.canActivate(c)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('exige exactamente la sección Nutricion + la acción', async () => {
      rolRepo.findOne.mockResolvedValue({ id_rol: 7 });
      rpaRepo.findOne.mockResolvedValue({ id: 1 });
      await expect(seccionGuard.canActivate(ctx(metodo, { id: 1, roleId: 7 }))).resolves.toBe(true);
      expect(rpaRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ permiso: { seccion: 'Nutricion' }, accion: { accion } }),
        }),
      );
    });

    it('sin roleId (token sin rol) → 403 sin consultar la base', async () => {
      const c = ctx(metodo, { id: 1 });
      await expect(rolesGuard.canActivate(c)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(seccionGuard.canActivate(c)).rejects.toBeInstanceOf(ForbiddenException);
      expect(rpaRepo.findOne).not.toHaveBeenCalled();
    });
  });

  it('un usuario con permiso SOLO sobre TerapiaFisica no entra a Nutrición (CA-24, sección única y exacta)', async () => {
    rolRepo.findOne.mockResolvedValue({ id_rol: 5 });
    rpaRepo.findOne.mockImplementation(({ where }: any) =>
      Promise.resolve(where.permiso.seccion === 'TerapiaFisica' ? { id: 1 } : null),
    );
    for (const [metodo] of endpoints) {
      await expect(seccionGuard.canActivate(ctx(metodo, { id: 1, roleId: 5 }))).rejects.toBeInstanceOf(ForbiddenException);
    }
  });

  it('quien solo tiene Ver NO puede escribir (Ver no sustituye a Crear/Actualizar)', async () => {
    rolRepo.findOne.mockResolvedValue({ id_rol: 5 });
    rpaRepo.findOne.mockImplementation(({ where }: any) => Promise.resolve(where.accion.accion === 'Ver' ? { id: 1 } : null));
    for (const metodo of ['crear', 'actualizar', 'confirmar', 'anular']) {
      await expect(seccionGuard.canActivate(ctx(metodo, { id: 1, roleId: 5 }))).rejects.toBeInstanceOf(ForbiddenException);
    }
    for (const metodo of ['listar', 'vigente', 'detalle']) {
      await expect(seccionGuard.canActivate(ctx(metodo, { id: 1, roleId: 5 }))).resolves.toBe(true);
    }
  });

  it('rutas y verbos HTTP según B.1.11 (mismo contrato que Terapia Física), y NINGÚN DELETE', () => {
    const proto = ValoracionesNutricionalesController.prototype as any;
    const ruta = (m: string) => [Reflect.getMetadata(METHOD_METADATA, proto[m]), Reflect.getMetadata(PATH_METADATA, proto[m])];
    expect(ruta('listar')).toEqual([RequestMethod.GET, 'expedientes/:expedienteId/valoraciones-nutricionales']);
    expect(ruta('vigente')).toEqual([RequestMethod.GET, 'expedientes/:expedienteId/valoraciones-nutricionales/vigente']);
    expect(ruta('detalle')).toEqual([RequestMethod.GET, 'valoraciones-nutricionales/:id']);
    expect(ruta('crear')).toEqual([RequestMethod.POST, 'expedientes/:expedienteId/valoraciones-nutricionales']);
    expect(ruta('actualizar')).toEqual([RequestMethod.PATCH, 'valoraciones-nutricionales/:id']);
    expect(ruta('confirmar')).toEqual([RequestMethod.PATCH, 'valoraciones-nutricionales/:id/confirmar']);
    expect(ruta('anular')).toEqual([RequestMethod.PATCH, 'valoraciones-nutricionales/:id/anular']);

    const verbos = Object.getOwnPropertyNames(proto)
      .filter((m) => m !== 'constructor')
      .map((m) => Reflect.getMetadata(METHOD_METADATA, proto[m]));
    expect(verbos).not.toContain(RequestMethod.DELETE);
    expect(verbos).toHaveLength(7);
  });

  it('el usuario que escribe sale del token (req.user.id), no del body', async () => {
    const service = { crear: jest.fn(), actualizar: jest.fn(), confirmar: jest.fn(), anular: jest.fn() };
    const controller = new ValoracionesNutricionalesController(service as any);
    const req = { user: { id: 77, roleId: 1 } };
    await controller.crear(5, {}, req);
    await controller.actualizar(9, {}, req);
    await controller.confirmar(9, req);
    await controller.anular(9, { motivo: 'x' }, req);
    expect(service.crear).toHaveBeenCalledWith(5, {}, 77);
    expect(service.actualizar).toHaveBeenCalledWith(9, {}, 77);
    expect(service.confirmar).toHaveBeenCalledWith(9, 77);
    expect(service.anular).toHaveBeenCalledWith(9, 'x', 77);
  });
});
