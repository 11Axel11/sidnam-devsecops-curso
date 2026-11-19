import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RolesAccionesGuard } from './actions.guard';
import { RolUsuario } from '../../gestion-usuario/entities/rol.entity';
import { RolPermisoAccion } from '../../gestion-usuario/entities/rolPermisoAccion.entity';

describe('RolesAccionesGuard', () => {
  let guard: RolesAccionesGuard;
  let reflector: Reflector;
  let rolRepo: { findOne: jest.Mock };
  let rolPermisoAccionRepo: { findOne: jest.Mock };

  const buildContext = (user: any): ExecutionContext =>
    ({
      getHandler: () => ({}) as any,
      getClass: () => ({}) as any,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesAccionesGuard,
        Reflector,
        {
          provide: getRepositoryToken(RolPermisoAccion),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(RolUsuario),
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();

    guard = module.get(RolesAccionesGuard);
    reflector = module.get(Reflector);
    rolPermisoAccionRepo = module.get(getRepositoryToken(RolPermisoAccion));
    rolRepo = module.get(getRepositoryToken(RolUsuario));
  });

  it('permite el acceso cuando el endpoint no declara @AccionRequerida', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const context = buildContext({ id: 1, roleId: 5 });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(rolRepo.findOne).not.toHaveBeenCalled();
    expect(rolPermisoAccionRepo.findOne).not.toHaveBeenCalled();
  });

  it('deniega con ForbiddenException (403) si request.user.roleId es undefined, sin resolver ningún rol', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('Crear');

    // Simula el contrato roto entre el JWT y el guard: el payload no trae
    // `roleId` (p. ej. porque alguien volvió a llamarlo `rol_id`/`roleid`).
    // El mock de rolRepo.findOne imita el comportamiento real de TypeORM: si
    // se le pasara `id_rol: undefined`, la condición se ignora y devolvería
    // la primera fila de la tabla en vez de fallar. Por eso la única forma
    // de pasar este test es que el guard NUNCA llegue a llamar a rolRepo con
    // un roleId no resuelto.
    rolRepo.findOne.mockResolvedValue({ id_rol: 1, nombre: 'Cualquier rol' });

    const context = buildContext({ id: 1, roleId: undefined });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(rolRepo.findOne).not.toHaveBeenCalled();
    expect(rolPermisoAccionRepo.findOne).not.toHaveBeenCalled();
  });

  it('deniega con ForbiddenException (403) si el rol resuelto no existe', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('Crear');
    rolRepo.findOne.mockResolvedValue(null);

    const context = buildContext({ id: 1, roleId: 999 });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(rolPermisoAccionRepo.findOne).not.toHaveBeenCalled();
  });

  it('deniega con ForbiddenException (403) si el rol del usuario no tiene el permiso/acción requerida', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('Crear');
    rolRepo.findOne.mockResolvedValue({ id_rol: 5, nombre: 'Voluntario' });
    rolPermisoAccionRepo.findOne.mockResolvedValue(null);

    const context = buildContext({ id: 1, roleId: 5 });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(rolRepo.findOne).toHaveBeenCalledWith({ where: { id_rol: 5 } });
    expect(rolPermisoAccionRepo.findOne).toHaveBeenCalledWith({
      where: {
        rol: { id_rol: 5 },
        accion: { accion: 'Crear' },
      },
      relations: ['accion', 'rol'],
    });
  });

  it('permite el acceso cuando el rol del usuario sí tiene el permiso/acción requerida', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('Crear');
    rolRepo.findOne.mockResolvedValue({ id_rol: 5, nombre: 'Administrador' });
    rolPermisoAccionRepo.findOne.mockResolvedValue({ id: 10 });

    const context = buildContext({ id: 1, roleId: 5 });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});
