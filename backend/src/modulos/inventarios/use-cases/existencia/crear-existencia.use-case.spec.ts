import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CrearExistenciaUseCase } from './crear-existencia.use-case';
import { Inventario } from '../../entities/inventario.entity';
import { Producto } from '../../entities/producto.entity';
import { Subcategoria_Producto } from '../../entities/subCategoriaProducto.entity';
import { Unidad_Medida } from 'src/modulos/unidades-medida/entities/unidadMedida.entity';

/**
 * Sin conexión a MySQL desde este entorno, las condiciones de carrera se
 * verifican a nivel de código: se simula que, entre la verificación previa y
 * el INSERT, otra petición ganó la carrera, y `save()` falla con el error
 * nativo ER_DUP_ENTRY que dispararían las restricciones reales
 * (producto.codigo único; (producto_id, sede) único).
 */
describe('CrearExistenciaUseCase', () => {
  const kg = { id_unidad: 4, nombre: 'Kilogramo', abreviatura: 'kg' };
  const bolsa = { id_unidad: 9, nombre: 'Bolsa', abreviatura: 'bls' };
  const dup = () => Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' });

  const arroz = { id: 123, nombre: 'Arroz', codigo: 'AR-001', archivado: false };

  type Mocks = {
    producto?: Partial<Record<'findOne' | 'create' | 'save', jest.Mock>>;
    inventario?: Partial<Record<'findOne' | 'create' | 'save', jest.Mock>>;
    unidad?: { findOne: jest.Mock };
    subcategoria?: { findOne: jest.Mock };
  };

  const build = (m: Mocks) => {
    const repos = {
      producto: { findOne: jest.fn(), create: jest.fn((x) => x), save: jest.fn(), ...m.producto },
      inventario: { findOne: jest.fn(), create: jest.fn((x) => x), save: jest.fn(), ...m.inventario },
      unidad: { findOne: jest.fn().mockResolvedValue(kg), ...m.unidad },
      subcategoria: { findOne: jest.fn().mockResolvedValue({ id: 1 }), ...m.subcategoria },
    };
    const manager = {
      getRepository: (entity: any) => {
        if (entity === Producto) return repos.producto;
        if (entity === Inventario) return repos.inventario;
        if (entity === Unidad_Medida) return repos.unidad;
        if (entity === Subcategoria_Producto) return repos.subcategoria;
        throw new Error('repo no mockeado: ' + entity?.name);
      },
    };
    const dataSource = {
      transaction: jest.fn((_iso: string, cb: any) => cb(manager)),
    };
    return { useCase: new CrearExistenciaUseCase(dataSource as any), repos, dataSource };
  };

  const guardaConId = (id: number) =>
    jest.fn().mockImplementation((x) => Promise.resolve({ id, ...x }));

  describe('validación de entrada', () => {
    it('400 si no se indica ni productoId ni producto', async () => {
      const { useCase } = build({});
      await expect(useCase.crear({ sede: 'hogar' as any, unidadMedidaId: 4 })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('400 si se indican productoId y producto a la vez', async () => {
      const { useCase } = build({});
      await expect(
        useCase.crear({
          productoId: 1,
          producto: { nombre: 'x', codigo: 'x', categoriaId: 1 },
          sede: 'hogar' as any,
          unidadMedidaId: 4,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('todo corre en UNA transacción con aislamiento READ COMMITTED', async () => {
      const { useCase, dataSource } = build({
        producto: { findOne: jest.fn().mockResolvedValue(arroz) },
        inventario: { findOne: jest.fn().mockResolvedValue(null), save: guardaConId(1) },
      });
      await useCase.crear({ productoId: 123, unidadMedidaId: 4, sede: 'hogar' as any });
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(dataSource.transaction.mock.calls[0][0]).toBe('READ COMMITTED');
    });
  });

  describe('con productoId (producto ya existente)', () => {
    it('404 si el producto no existe', async () => {
      const { useCase } = build({ producto: { findOne: jest.fn().mockResolvedValue(null) } });
      await expect(
        useCase.crear({ productoId: 999, unidadMedidaId: 4, sede: 'hogar' as any }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('409 con inventarioExistenteId si ya existe la existencia en esa sede', async () => {
      const { useCase } = build({
        producto: { findOne: jest.fn().mockResolvedValue(arroz) },
        inventario: { findOne: jest.fn().mockResolvedValue({ id: 456 }) },
      });
      await expect(
        useCase.crear({ productoId: 123, unidadMedidaId: 4, sede: 'cecuidam' as any }),
      ).rejects.toMatchObject({
        status: 409,
        response: expect.objectContaining({
          statusCode: 409,
          message: 'Ya existe una existencia para este producto en la sede indicada.',
          inventarioExistenteId: 456,
        }),
      });
    });

    it('carrera: la verificación previa no ve nada pero save() falla por ER_DUP_ENTRY -> 409 con el id del ganador', async () => {
      let llamadas = 0;
      const { useCase } = build({
        producto: { findOne: jest.fn().mockResolvedValue(arroz) },
        inventario: {
          findOne: jest.fn().mockImplementation(() => {
            llamadas++;
            return Promise.resolve(llamadas === 1 ? null : { id: 789 });
          }),
          save: jest.fn().mockRejectedValue(dup()),
        },
      });
      await expect(
        useCase.crear({ productoId: 123, unidadMedidaId: 4, sede: 'cecuidam' as any }),
      ).rejects.toMatchObject({
        status: 409,
        response: expect.objectContaining({ inventarioExistenteId: 789 }),
      });
    });

    it('un error que NO es de duplicado se propaga sin convertirlo en 409', async () => {
      const otro = new Error('Conexión perdida');
      const { useCase } = build({
        producto: { findOne: jest.fn().mockResolvedValue(arroz) },
        inventario: { findOne: jest.fn().mockResolvedValue(null), save: jest.fn().mockRejectedValue(otro) },
      });
      await expect(
        useCase.crear({ productoId: 123, unidadMedidaId: 4, sede: 'cecuidam' as any }),
      ).rejects.toBe(otro);
    });
  });

  describe('con bloque producto (buscar o crear por código)', () => {
    const datos = { nombre: 'Frijoles', codigo: 'FR-010', categoriaId: 1 };

    it('código inexistente: crea producto + existencia y marca productoCreado=true', async () => {
      const { useCase, repos } = build({
        producto: { findOne: jest.fn().mockResolvedValue(null), save: guardaConId(50) },
        inventario: { findOne: jest.fn().mockResolvedValue(null), save: guardaConId(60) },
      });

      const r = await useCase.crear({ producto: datos, unidadMedidaId: 4, sede: 'cecuidam' as any, stockInicial: 3 });

      expect(repos.producto.save).toHaveBeenCalledTimes(1);
      expect(r).toEqual({
        id: 60,
        producto: { id: 50, nombre: 'Frijoles', codigo: 'FR-010' },
        unidadMedida: { id: 4, nombre: 'Kilogramo', abreviatura: 'kg' },
        sede: 'cecuidam',
        stock: 3,
        archivado: false,
        productoCreado: true,
      });
    });

    it('producto nuevo sin unidadMedidaId -> 400 (no hay de dónde heredarla)', async () => {
      const { useCase } = build({ producto: { findOne: jest.fn().mockResolvedValue(null) } });
      await expect(
        useCase.crear({ producto: datos, sede: 'hogar' as any }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('categoría inválida al crear -> 400', async () => {
      const { useCase } = build({ producto: { findOne: jest.fn().mockResolvedValue(null) } });
      await expect(
        useCase.crear({ producto: { ...datos, categoriaId: 99 }, unidadMedidaId: 4, sede: 'hogar' as any }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('código existente: GANA el producto existente (no se guarda otro) y se devuelve el que quedó', async () => {
      const { useCase, repos } = build({
        producto: { findOne: jest.fn().mockResolvedValue(arroz) },
        inventario: { findOne: jest.fn().mockResolvedValue(null), save: guardaConId(70) },
      });

      // Mismo código, pero nombre/categoría distintos a los guardados.
      const r = await useCase.crear({
        producto: { nombre: 'ARROZ BLANCO 1KG', codigo: 'AR-001', categoriaId: 2 },
        unidadMedidaId: 4,
        sede: 'cecuidam' as any,
      });

      expect(repos.producto.save).not.toHaveBeenCalled();
      expect(r.producto).toEqual({ id: 123, nombre: 'Arroz', codigo: 'AR-001' });
      expect(r.productoCreado).toBe(false);
    });

    it('código existente que ya tiene existencia en esa sede -> 409 con inventarioExistenteId', async () => {
      const { useCase } = build({
        producto: { findOne: jest.fn().mockResolvedValue(arroz) },
        inventario: { findOne: jest.fn().mockResolvedValue({ id: 456 }) },
      });
      await expect(
        useCase.crear({ producto: { nombre: 'x', codigo: 'AR-001', categoriaId: 1 }, unidadMedidaId: 4, sede: 'hogar' as any }),
      ).rejects.toMatchObject({ status: 409, response: expect.objectContaining({ inventarioExistenteId: 456 }) });
    });

    it('carrera sobre el código: save() del producto falla por ER_DUP_ENTRY -> se reutiliza el ganador, sin 500 ni duplicado', async () => {
      let llamadas = 0;
      const { useCase, repos } = build({
        producto: {
          findOne: jest.fn().mockImplementation(() => {
            llamadas++;
            // 1ra: todavía no existe. 2da (reintento): ya está el del ganador.
            return Promise.resolve(llamadas === 1 ? null : arroz);
          }),
          save: jest.fn().mockRejectedValue(dup()),
        },
        inventario: { findOne: jest.fn().mockResolvedValue(null), save: guardaConId(80) },
      });

      const r = await useCase.crear({
        producto: { nombre: 'Arroz', codigo: 'AR-001', categoriaId: 1 },
        unidadMedidaId: 4,
        sede: 'cecuidam' as any,
      });

      expect(r.producto.id).toBe(123);
      expect(r.productoCreado).toBe(false);
      expect(repos.inventario.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('unidad de medida por sede', () => {
    it('sin unidadMedidaId, hereda la unidad de la primera existencia del producto', async () => {
      const { useCase, repos } = build({
        producto: { findOne: jest.fn().mockResolvedValue(arroz) },
        inventario: {
          findOne: jest
            .fn()
            // 1ra: primera existencia (para heredar la unidad). 2da: ¿ya existe en la sede?
            .mockResolvedValueOnce({ id: 1, unidad_medida: kg })
            .mockResolvedValueOnce(null),
          save: guardaConId(90),
        },
      });

      const r = await useCase.crear({ productoId: 123, sede: 'cecuidam' as any });

      expect(r.unidadMedida.id).toBe(4);
      expect(repos.inventario.findOne.mock.calls[0][0]).toMatchObject({ order: { id: 'ASC' } });
    });

    it('con unidadMedidaId distinta, la existencia de la otra sede puede usar otra unidad', async () => {
      const { useCase } = build({
        producto: { findOne: jest.fn().mockResolvedValue(arroz) },
        unidad: { findOne: jest.fn().mockResolvedValue(bolsa) },
        inventario: { findOne: jest.fn().mockResolvedValue(null), save: guardaConId(91) },
      });

      const r = await useCase.crear({ productoId: 123, unidadMedidaId: 9, sede: 'cecuidam' as any });

      expect(r.unidadMedida).toEqual({ id: 9, nombre: 'Bolsa', abreviatura: 'bls' });
    });

    it('sin unidadMedidaId y sin existencias previas -> 400', async () => {
      const { useCase } = build({
        producto: { findOne: jest.fn().mockResolvedValue(arroz) },
        inventario: { findOne: jest.fn().mockResolvedValue(null) },
      });
      await expect(
        useCase.crear({ productoId: 123, sede: 'cecuidam' as any }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('unidadMedidaId inexistente -> 404', async () => {
      const { useCase } = build({
        producto: { findOne: jest.fn().mockResolvedValue(arroz) },
        unidad: { findOne: jest.fn().mockResolvedValue(null) },
      });
      await expect(
        useCase.crear({ productoId: 123, unidadMedidaId: 777, sede: 'cecuidam' as any }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('autorización por categoría (permisos como en Hogar)', () => {
    it('se autoriza con la categoría REAL del producto existente, no con la que declara el cliente', async () => {
      const autorizar = jest.fn().mockResolvedValue(undefined);
      const medicamento = { id: 7, nombre: 'Paracetamol', codigo: 'MED-1', categoriaTipo: 'Medicamentos' };
      const { useCase } = build({
        producto: { findOne: jest.fn().mockResolvedValue(medicamento) },
        inventario: { findOne: jest.fn().mockResolvedValue(null), save: guardaConId(1) },
      });

      // El cliente declara categoriaId=1 (Alimentos) para un código que en la base es Medicamentos.
      await useCase.crear(
        { producto: { nombre: 'x', codigo: 'MED-1', categoriaId: 1 }, unidadMedidaId: 4, sede: 'cecuidam' as any },
        autorizar,
      );

      expect(autorizar).toHaveBeenCalledWith('Medicamentos');
    });

    it('con productoId también se autoriza con la categoría guardada', async () => {
      const autorizar = jest.fn().mockResolvedValue(undefined);
      const { useCase } = build({
        producto: { findOne: jest.fn().mockResolvedValue({ ...arroz, categoriaTipo: 'Alimentos' }) },
        inventario: { findOne: jest.fn().mockResolvedValue(null), save: guardaConId(2) },
      });
      await useCase.crear({ productoId: 123, unidadMedidaId: 4, sede: 'hogar' as any }, autorizar);
      expect(autorizar).toHaveBeenCalledWith('Alimentos');
    });

    it('producto nuevo: se autoriza con la categoría que se va a crear, ANTES de guardar', async () => {
      const autorizar = jest.fn().mockRejectedValue(new Error('403'));
      const { useCase, repos } = build({ producto: { findOne: jest.fn().mockResolvedValue(null), save: guardaConId(9) } });
      await expect(
        useCase.crear({ producto: { nombre: 'Jabón', codigo: 'LI-1', categoriaId: 2 }, unidadMedidaId: 4, sede: 'cecuidam' as any }, autorizar),
      ).rejects.toThrow('403');
      expect(autorizar).toHaveBeenCalledWith('Limpieza');
      expect(repos.producto.save).not.toHaveBeenCalled();
    });

    it('si se deniega, NO se escribe nada (ni producto ni existencia)', async () => {
      const autorizar = jest.fn().mockRejectedValue(new Error('403'));
      const { useCase, repos } = build({
        producto: { findOne: jest.fn().mockResolvedValue(arroz), save: guardaConId(1) },
        inventario: { findOne: jest.fn().mockResolvedValue(null), save: guardaConId(1) },
      });
      await expect(
        useCase.crear({ productoId: 123, unidadMedidaId: 4, sede: 'cecuidam' as any }, autorizar),
      ).rejects.toThrow('403');
      expect(repos.producto.save).not.toHaveBeenCalled();
      expect(repos.inventario.save).not.toHaveBeenCalled();
    });
  });
});
