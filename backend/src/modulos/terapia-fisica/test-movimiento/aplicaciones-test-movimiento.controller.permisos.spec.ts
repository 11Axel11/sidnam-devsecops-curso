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
import { AplicacionesTestMovimientoController } from './aplicaciones-test-movimiento.controller';

/**
 * 403 reales: los contextos apuntan a los MÉTODOS REALES del controller, así que si alguien quita un
 * decorador de permiso, el test falla.
 */
describe('Test de movimiento — permisos TerapiaFisica:<acción>', () => {
  let rolesGuard: RolesAccionesGuard;
  let seccionGuard: SeccionGuard;
  let rolRepo: { findOne: jest.Mock };
  let rpaRepo: { findOne: jest.Mock };

  const ctx = (metodo: string, user: any): ExecutionContext =>
    ({
      getHandler: () => (AplicacionesTestMovimientoController.prototype as any)[metodo],
      getClass: () => AplicacionesTestMovimientoController,
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
    ['detalle', 'Ver'],
    ['crear', 'Crear'],
    ['anular', 'Actualizar'], // anular = Actualizar
  ] as const;

  it('el controller aplica AuthGuard + RolesAccionesGuard + SeccionGuard', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, AplicacionesTestMovimientoController)).toEqual([
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

    it('exige exactamente la sección TerapiaFisica + la acción', async () => {
      rolRepo.findOne.mockResolvedValue({ id_rol: 7 });
      rpaRepo.findOne.mockResolvedValue({ id: 1 });
      await expect(seccionGuard.canActivate(ctx(metodo, { id: 1, roleId: 7 }))).resolves.toBe(true);
      expect(rpaRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ permiso: { seccion: 'TerapiaFisica' }, accion: { accion } }),
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

  it('un usuario con permiso SOLO sobre Nutricion no entra al test de movimiento (sección única y exacta)', async () => {
    rolRepo.findOne.mockResolvedValue({ id_rol: 5 });
    rpaRepo.findOne.mockImplementation(({ where }: any) => Promise.resolve(where.permiso.seccion === 'Nutricion' ? { id: 1 } : null));
    for (const [metodo] of endpoints) {
      await expect(seccionGuard.canActivate(ctx(metodo, { id: 1, roleId: 5 }))).rejects.toBeInstanceOf(ForbiddenException);
    }
  });

  it('quien solo tiene Ver NO puede escribir (Ver no sustituye a Crear/Actualizar)', async () => {
    rolRepo.findOne.mockResolvedValue({ id_rol: 5 });
    rpaRepo.findOne.mockImplementation(({ where }: any) => Promise.resolve(where.accion.accion === 'Ver' ? { id: 1 } : null));
    for (const metodo of ['crear', 'anular']) {
      await expect(seccionGuard.canActivate(ctx(metodo, { id: 1, roleId: 5 }))).rejects.toBeInstanceOf(ForbiddenException);
    }
    for (const metodo of ['listar', 'detalle']) {
      await expect(seccionGuard.canActivate(ctx(metodo, { id: 1, roleId: 5 }))).resolves.toBe(true);
    }
  });

  it('rutas y verbos HTTP según B.1.8, y NINGÚN DELETE ni PATCH de edición', () => {
    const proto = AplicacionesTestMovimientoController.prototype as any;
    const ruta = (m: string) => [Reflect.getMetadata(METHOD_METADATA, proto[m]), Reflect.getMetadata(PATH_METADATA, proto[m])];
    expect(ruta('listar')).toEqual([RequestMethod.GET, 'expedientes/:expedienteId/aplicaciones-test-movimiento']);
    expect(ruta('detalle')).toEqual([RequestMethod.GET, 'aplicaciones-test-movimiento/:id']);
    expect(ruta('crear')).toEqual([RequestMethod.POST, 'expedientes/:expedienteId/aplicaciones-test-movimiento']);
    expect(ruta('anular')).toEqual([RequestMethod.PATCH, 'aplicaciones-test-movimiento/:id/anular']);

    const verbos = Object.getOwnPropertyNames(proto)
      .filter((m) => m !== 'constructor')
      .map((m) => Reflect.getMetadata(METHOD_METADATA, proto[m]));
    expect(verbos).not.toContain(RequestMethod.DELETE);
    expect(verbos).toHaveLength(4);
  });

  it('el usuario que escribe sale del token (req.user.id), no del body', async () => {
    const service = { crear: jest.fn(), anular: jest.fn() };
    const controller = new AplicacionesTestMovimientoController(service as any);
    const req = { user: { id: 77, roleId: 1 } };
    const dto = { ejercicios: [] };
    await controller.crear(5, dto, req);
    await controller.anular(9, { motivo: 'x' }, req);
    expect(service.crear).toHaveBeenCalledWith(5, dto, 77);
    expect(service.anular).toHaveBeenCalledWith(9, 'x', 77);
  });
});
