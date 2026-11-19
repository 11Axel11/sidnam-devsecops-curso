/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return -- mocks de repositorios/guards */
import 'reflect-metadata';
import { ExecutionContext, ForbiddenException, RequestMethod } from '@nestjs/common';
import { GUARDS_METADATA, INTERCEPTORS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RolesAccionesGuard } from 'src/modulos/autenticacion/guard/actions.guard';
import { AuthGuard } from 'src/modulos/autenticacion/guard/auth.guard';
import { SeccionGuard } from 'src/modulos/autenticacion/guard/seccion.guard';
import { RolUsuario } from 'src/modulos/gestion-usuario/entities/rol.entity';
import { RolPermisoAccion } from 'src/modulos/gestion-usuario/entities/rolPermisoAccion.entity';
import { ReporteSemestralController } from './reporte-semestral.controller';

/** 403 reales contra el MÉTODO REAL del controller: si alguien quita un decorador de permiso, falla. */
describe('Reporte semestral de Terapia Física — permisos TerapiaFisica:Ver', () => {
  let rolesGuard: RolesAccionesGuard;
  let seccionGuard: SeccionGuard;
  let rolRepo: { findOne: jest.Mock };
  let rpaRepo: { findOne: jest.Mock };

  const ctx = (user: any): ExecutionContext =>
    ({
      getHandler: () => (ReporteSemestralController.prototype as any).pdf,
      getClass: () => ReporteSemestralController,
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

  it('AuthGuard + RolesAccionesGuard + SeccionGuard', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, ReporteSemestralController)).toEqual([AuthGuard, RolesAccionesGuard, SeccionGuard]);
  });

  it('403 si el rol no tiene TerapiaFisica:Ver', async () => {
    rolRepo.findOne.mockResolvedValue({ id_rol: 3 });
    rpaRepo.findOne.mockResolvedValue(null);
    await expect(rolesGuard.canActivate(ctx({ id: 1, roleId: 3 }))).rejects.toBeInstanceOf(ForbiddenException);
    await expect(seccionGuard.canActivate(ctx({ id: 1, roleId: 3 }))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('exige exactamente la sección TerapiaFisica y la acción Ver', async () => {
    rolRepo.findOne.mockResolvedValue({ id_rol: 7 });
    rpaRepo.findOne.mockResolvedValue({ id: 1 });
    await expect(seccionGuard.canActivate(ctx({ id: 1, roleId: 7 }))).resolves.toBe(true);
    expect(rpaRepo.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ permiso: { seccion: 'TerapiaFisica' }, accion: { accion: 'Ver' } }) }));
  });

  it('sin roleId (token sin rol) → 403 sin consultar la base', async () => {
    await expect(rolesGuard.canActivate(ctx({ id: 1 }))).rejects.toBeInstanceOf(ForbiddenException);
    await expect(seccionGuard.canActivate(ctx({ id: 1 }))).rejects.toBeInstanceOf(ForbiddenException);
    expect(rpaRepo.findOne).not.toHaveBeenCalled();
  });

  it('un permiso solo sobre Nutricion o FichaResumen NO da acceso al informe de Terapia Física', async () => {
    rolRepo.findOne.mockResolvedValue({ id_rol: 5 });
    rpaRepo.findOne.mockImplementation(({ where }: any) => Promise.resolve(where.permiso.seccion !== 'TerapiaFisica' ? { id: 1 } : null));
    await expect(seccionGuard.canActivate(ctx({ id: 1, roleId: 5 }))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('ruta GET reportes/terapia-fisica/semestral/pdf, único endpoint, y SIN NombresDeUsuarioInterceptor (devuelve un PDF)', () => {
    const proto = ReporteSemestralController.prototype as any;
    expect([Reflect.getMetadata(METHOD_METADATA, proto.pdf), Reflect.getMetadata(PATH_METADATA, proto.pdf)]).toEqual([RequestMethod.GET, 'reportes/terapia-fisica/semestral/pdf']);
    expect(Object.getOwnPropertyNames(proto).filter((m) => m !== 'constructor')).toEqual(['pdf']);
    expect(Reflect.getMetadata(INTERCEPTORS_METADATA, ReporteSemestralController) ?? []).toEqual([]);
    expect(Reflect.getMetadata(INTERCEPTORS_METADATA, proto.pdf) ?? []).toEqual([]);
  });

  it('delega en el servicio con la query validada y la respuesta', async () => {
    const service = { generarPdf: jest.fn() };
    const controller = new ReporteSemestralController(service as any);
    const res = {} as any;
    await controller.pdf({ anio: 2026, semestre: 1 } as never, res);
    expect(service.generarPdf).toHaveBeenCalledWith({ anio: 2026, semestre: 1 }, res);
  });
});
