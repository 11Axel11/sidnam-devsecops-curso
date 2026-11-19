import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RolesAccionesGuard } from 'src/modulos/autenticacion/guard/actions.guard';
import { SeccionGuard } from 'src/modulos/autenticacion/guard/seccion.guard';
import { RolUsuario } from 'src/modulos/gestion-usuario/entities/rol.entity';
import { RolPermisoAccion } from 'src/modulos/gestion-usuario/entities/rolPermisoAccion.entity';
import { InventarioController } from './inventario.controller';
import { FacturasProveedoresController } from 'src/modulos/facturas-proveedores/facturas-proveedores.controller';
import { CategoriasPrincipalesProductos as Cat } from 'src/common/enums/categoriasPrincipalesProductos.enum';

/**
 * Los permisos son los ya existentes (secciones Alimentos / Limpieza /
 * Medicamentos / Salidas / Facturas Proveduría), iguales para Hogar y
 * CECUIDAM. Los contextos apuntan a los MÉTODOS REALES de los controllers,
 * para que si alguien borra los decoradores/verificaciones el test falle.
 */
describe('Inventario / Facturas — 403 reales con los permisos existentes', () => {
  let rolesGuard: RolesAccionesGuard;
  let seccionGuard: SeccionGuard;
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

  describe('salidas (opción 2): Actualizar en la sección Salidas', () => {
    const endpoints = [
      ['registrar salida por existencia', 'registrarSalidaExistencia'],
      ['registrar salida por lote (legacy)', 'crearSalidas'],
    ] as const;

    it.each(endpoints)('%s: 403 si el rol no tiene Salidas:Actualizar', async (_n, metodo) => {
      rolRepo.findOne.mockResolvedValue({ id_rol: 3, nombre: 'Administrador' });
      rpaRepo.findOne.mockResolvedValue(null);
      const c = ctx(InventarioController, metodo, { id: 1, roleId: 3 });
      await expect(rolesGuard.canActivate(c)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it.each(endpoints)('%s: exige exactamente Salidas + Actualizar', async (_n, metodo) => {
      rolRepo.findOne.mockResolvedValue({ id_rol: 7 });
      rpaRepo.findOne.mockResolvedValue({ id: 1 });
      const c = ctx(InventarioController, metodo, { id: 1, roleId: 7 });
      await expect(seccionGuard.canActivate(c)).resolves.toBe(true);
      expect(rpaRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ permiso: { seccion: 'Salidas' }, accion: { accion: 'Actualizar' } }),
        }),
      );
    });
  });

  describe('facturas: sección Facturas Proveduría', () => {
    it.each([
      ['getFacturas', 'Ver'],
      ['getFacturaPdf', 'Ver'],
      ['createFactura', 'Crear'],
    ])('%s exige %s en Facturas Proveduría (403 sin él)', async (metodo, accion) => {
      rolRepo.findOne.mockResolvedValue({ id_rol: 9 });
      rpaRepo.findOne.mockResolvedValue(null);
      const c = ctx(FacturasProveedoresController, metodo, { id: 1, roleId: 9 });
      await expect(seccionGuard.canActivate(c)).rejects.toBeInstanceOf(ForbiddenException);
      expect(rpaRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            permiso: { seccion: 'Facturas Proveduría' },
            accion: { accion },
          }),
        }),
      );
    });
  });

  describe('endpoints por categoría: 403 real a quien no tiene el permiso sobre esa categoría', () => {
    // Controller con el servicio de permisos simulado como un rol que SOLO
    // tiene Alimentos:Crear/Ver.
    const build = () => {
      const tiene = (cat: Cat, acciones: string[]) =>
        cat === Cat.ALIMENTOS && acciones.some((a) => ['Crear', 'Ver'].includes(a));
      const denegar = () => Promise.reject(new ForbiddenException('sin permiso'));
      const permisos = {
        exigirCategoria: jest.fn((_r: any, cat: Cat, acc: string[]) => (tiene(cat, acc) ? Promise.resolve() : denegar())),
        exigirParaExistencia: jest.fn(() => denegar()),
        exigirParaExistencias: jest.fn(() => denegar()),
        categoriasPermitidas: jest.fn().mockResolvedValue([Cat.ALIMENTOS]),
      };
      const controller: any = Object.create(InventarioController.prototype);
      controller.permisos = permisos;
      controller.listarExistenciasUseCase = { listar: jest.fn().mockResolvedValue({ data: [], total: 0 }) };
      controller.createProductoUseCase = { crearProducto: jest.fn() };
      return { controller, permisos };
    };
    const req = { user: { id: 1, roleId: 4 } } as any;

    it('POST /inventario: el permiso se verifica con la categoría REAL (aunque el cliente declare otra)', async () => {
      const { controller } = build();
      // El use-case real resolvería el producto existente (Medicamentos) y llamaría al callback con ESA categoría.
      controller.crearExistenciaUseCase = {
        crear: jest.fn((_dto: any, autorizar: any) => autorizar(Cat.MEDICAMENTOS)),
      };
      await expect(
        controller.crearExistencia({ producto: { nombre: 'x', codigo: 'MED-1', categoriaId: 1 }, sede: 'cecuidam' }, req),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('POST /inventario: pasa si el permiso es sobre la categoría real del producto', async () => {
      const { controller } = build();
      controller.crearExistenciaUseCase = {
        crear: jest.fn(async (_dto: any, autorizar: any) => {
          await autorizar(Cat.ALIMENTOS);
          return { id: 1 };
        }),
      };
      await expect(controller.crearExistencia({ productoId: 1, sede: 'cecuidam' }, req)).resolves.toEqual({ id: 1 });
    });

    it('POST /inventario/productos (legacy): mismo control por categoría', async () => {
      const { controller } = build();
      controller.createProductoUseCase = {
        crearProducto: jest.fn((_dto: any, autorizar: any) => autorizar(Cat.LIMPIEZA)),
      };
      await expect(controller.crearProducto({}, req)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it.each([
      ['detalleExistencia (GET :id)', 'detalleExistencia', [1, req]],
      ['archivarExistencia', 'archivarExistencia', [1, { archivado: true }, req]],
      ['registrarEntradaExistencia', 'registrarEntradaExistencia', [1, {}, req]],
      ['listarEntradasExistencia', 'listarEntradasExistencia', [1, req]],
      ['listarSalidasExistencia', 'listarSalidasExistencia', [1, req]],
      ['crearEntradas (lote legacy)', 'crearEntradas', [{ productos: [{ inventarioId: 1, cantidad: 1 }] }, req]],
    ])('%s: 403 si no tiene el permiso sobre la categoría', async (_n, metodo, args) => {
      const { controller } = build();
      await expect(controller[metodo](...args)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('GET /inventario con categoría de otra sección -> 403; sin categoría solo lista las permitidas', async () => {
      const { controller } = build();
      await expect(controller.listarExistencias({ sede: 'hogar', categoria: 2 }, req)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await controller.listarExistencias({ sede: 'hogar' }, req);
      expect(controller.listarExistenciasUseCase.listar).toHaveBeenCalledWith({ sede: 'hogar' }, [Cat.ALIMENTOS]);
    });

    it('GET /inventario y /categorias sin ninguna categoría con Ver -> 403', async () => {
      const { controller, permisos } = build();
      permisos.categoriasPermitidas.mockResolvedValue([]);
      await expect(controller.listarExistencias({ sede: 'hogar' }, req)).rejects.toBeInstanceOf(ForbiddenException);
      controller.listarCategoriasSedeUseCase = { listar: jest.fn() };
      await expect(controller.getCategoriasPorSede(req)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
