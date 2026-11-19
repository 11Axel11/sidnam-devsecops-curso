/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return -- mocks de repositorios/guards */
import 'reflect-metadata';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { RolesAccionesGuard } from 'src/modulos/autenticacion/guard/actions.guard';
import { SeccionGuard } from 'src/modulos/autenticacion/guard/seccion.guard';
import { RolUsuario } from 'src/modulos/gestion-usuario/entities/rol.entity';
import { RolPermisoAccion } from 'src/modulos/gestion-usuario/entities/rolPermisoAccion.entity';
import { CATALOGO_CONTROLLERS, AntecedentePersonalController } from './catalogos.controllers';
import { CatalogosPermisosService } from '../services/catalogos-permisos.service';

/**
 * 403 reales: los contextos apuntan a los MÉTODOS REALES de los controllers,
 * así que si alguien quita un decorador de permiso, el test falla.
 */
describe('Catálogos — permisos Catalogos:<acción> (sección sin tildes)', () => {
  let rolesGuard: RolesAccionesGuard;
  let seccionGuard: SeccionGuard;
  let permisos: CatalogosPermisosService;
  let rolRepo: { findOne: jest.Mock };
  let rpaRepo: { findOne: jest.Mock };

  const ctx = (controller: any, metodo: string, user: any): ExecutionContext =>
    ({
      getHandler: () => controller.prototype[metodo],
      getClass: () => controller,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesAccionesGuard,
        SeccionGuard,
        CatalogosPermisosService,
        Reflector,
        { provide: getRepositoryToken(RolPermisoAccion), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(RolUsuario), useValue: { findOne: jest.fn() } },
      ],
    }).compile();
    rolesGuard = module.get(RolesAccionesGuard);
    seccionGuard = module.get(SeccionGuard);
    permisos = module.get(CatalogosPermisosService);
    rpaRepo = module.get(getRepositoryToken(RolPermisoAccion));
    rolRepo = module.get(getRepositoryToken(RolUsuario));
  });

  describe.each(CATALOGO_CONTROLLERS.map((c) => [c.name, c] as const))('%s', (_n, controller) => {
    const escrituras = [
      ['crear', 'Crear'],
      ['desactivar', 'Actualizar'],
      ['reactivar', 'Actualizar'],
    ] as const;

    it.each(escrituras)('%s: 403 si el rol no tiene Catalogos:%s', async (metodo) => {
      rolRepo.findOne.mockResolvedValue({ id_rol: 3 });
      rpaRepo.findOne.mockResolvedValue(null);
      const c = ctx(controller, metodo, { id: 1, roleId: 3 });
      await expect(rolesGuard.canActivate(c)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(seccionGuard.canActivate(c)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it.each(escrituras)('%s: exige exactamente la sección Catalogos + %s', async (metodo, accion) => {
      rolRepo.findOne.mockResolvedValue({ id_rol: 7 });
      rpaRepo.findOne.mockResolvedValue({ id: 1 });
      await expect(seccionGuard.canActivate(ctx(controller, metodo, { id: 1, roleId: 7 }))).resolves.toBe(true);
      expect(rpaRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ permiso: { seccion: 'Catalogos' }, accion: { accion } }),
        }),
      );
    });

    it.each(escrituras)('%s: sin roleId (token sin rol) -> 403 sin consultar la base', async (metodo) => {
      const c = ctx(controller, metodo, { id: 1 });
      await expect(rolesGuard.canActivate(c)).rejects.toBeInstanceOf(ForbiddenException);
      expect(rpaRepo.findOne).not.toHaveBeenCalled();
    });

    it('NO existe ninguna ruta DELETE', () => {
      const proto = controller.prototype;
      const metodos = new Set<string>();
      for (let p = proto; p && p !== Object.prototype; p = Object.getPrototypeOf(p)) {
        Object.getOwnPropertyNames(p).filter((m) => m !== 'constructor').forEach((m) => metodos.add(m));
      }
      const verbos = [...metodos]
        .map((m) => Reflect.getMetadata(METHOD_METADATA, proto[m]))
        .filter((v) => v !== undefined);
      expect(verbos).not.toContain(RequestMethod.DELETE);
      // GET, POST y los dos PATCH
      expect(verbos.sort()).toEqual([RequestMethod.GET, RequestMethod.POST, RequestMethod.PATCH, RequestMethod.PATCH].sort());
    });
  });

  it('rutas: /catalogos/<catalogo> con :id/desactivar y :id/reactivar', () => {
    const proto = AntecedentePersonalController.prototype as any;
    expect(Reflect.getMetadata(PATH_METADATA, AntecedentePersonalController)).toBe('catalogos/antecedente-personal');
    expect(Reflect.getMetadata(PATH_METADATA, proto.desactivar)).toBe(':id/desactivar');
    expect(Reflect.getMetadata(PATH_METADATA, proto.reactivar)).toBe(':id/reactivar');
  });

  describe('GET: lectura de activos libre; ver inactivos exige Catalogos:Ver', () => {
    const build = () => {
      const service = { listar: jest.fn().mockResolvedValue([]) };
      const controller: any = Object.create(AntecedentePersonalController.prototype);
      controller.service = service;
      controller.permisos = permisos;
      return { controller, service };
    };

    it('soloActivos por defecto: cualquier autenticado (sin consultar permisos)', async () => {
      const { controller, service } = build();
      await controller.listar({}, { user: { id: 1, roleId: 99 } });
      expect(service.listar).toHaveBeenCalledWith(true);
      expect(rpaRepo.findOne).not.toHaveBeenCalled();
    });

    it('soloActivos=false sin Catalogos:Ver -> 403 y no lista', async () => {
      const { controller, service } = build();
      rolRepo.findOne.mockResolvedValue({ id_rol: 3 });
      rpaRepo.findOne.mockResolvedValue(null);
      await expect(controller.listar({ soloActivos: false }, { user: { id: 1, roleId: 3 } })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(service.listar).not.toHaveBeenCalled();
    });

    it('soloActivos=false con Catalogos:Ver -> lista incluyendo inactivos', async () => {
      const { controller, service } = build();
      rolRepo.findOne.mockResolvedValue({ id_rol: 3 });
      rpaRepo.findOne.mockResolvedValue({ id: 1 });
      await controller.listar({ soloActivos: false }, { user: { id: 1, roleId: 3 } });
      expect(service.listar).toHaveBeenCalledWith(false);
      expect(rpaRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ permiso: { seccion: 'Catalogos' }, accion: { accion: 'Ver' } }),
        }),
      );
    });

    it('soloActivos=false sin roleId -> 403 (falla cerrado)', async () => {
      const { controller } = build();
      await expect(controller.listar({ soloActivos: false }, { user: { id: 1 } })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  it('POST/PATCH pasan req.user.id al servicio (auditoría desde el token, no del body)', async () => {
    const service = { crear: jest.fn(), desactivar: jest.fn(), reactivar: jest.fn() };
    const controller: any = Object.create(AntecedentePersonalController.prototype);
    controller.service = service;
    const req = { user: { id: 77, roleId: 1 } };
    await controller.crear({ nombre: 'X' }, req);
    await controller.desactivar(5, req);
    await controller.reactivar(5, req);
    expect(service.crear).toHaveBeenCalledWith('X', 77);
    expect(service.desactivar).toHaveBeenCalledWith(5, 77);
    expect(service.reactivar).toHaveBeenCalledWith(5, 77);
  });
});
