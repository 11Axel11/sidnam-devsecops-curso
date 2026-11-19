import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { RegistrarSalidaExistenciaUseCase } from './registrar-salida-existencia.use-case';

describe('RegistrarSalidaExistenciaUseCase', () => {
  const buildManager = (overrides: {
    inventario: { id: number; stock: number } | null;
  }) => {
    const manager = {
      findOne: jest.fn().mockResolvedValue(overrides.inventario),
      create: jest.fn((_entity, data) => data),
      save: jest.fn().mockImplementation((_entity, data) =>
        Promise.resolve({ id: 999, ...data }),
      ),
    };
    return manager;
  };

  const buildUseCase = (manager: any) => {
    const dataSource = {
      transaction: jest.fn().mockImplementation((cb: any) => cb(manager)),
    };
    return new RegistrarSalidaExistenciaUseCase(dataSource as any);
  };

  it('responde 422 con stockDisponible/cantidadSolicitada cuando la cantidad excede el stock', async () => {
    const manager = buildManager({ inventario: { id: 1, stock: 3 } });
    const useCase = buildUseCase(manager);

    await expect(
      useCase.registrar(1, { cantidad: 5, fechaSalida: '2026-09-15T14:30:00-06:00' }, 42),
    ).rejects.toMatchObject({
      status: 422,
      response: expect.objectContaining({
        statusCode: 422,
        message: 'Stock insuficiente.',
        stockDisponible: 3,
        cantidadSolicitada: 5,
      }),
    });

    // No debe haber intentado guardar nada si la validación falla.
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('usa bloqueo pesimista (pessimistic_write) al leer el inventario dentro de la transacción', async () => {
    const manager = buildManager({ inventario: { id: 1, stock: 10 } });
    const useCase = buildUseCase(manager);

    await useCase.registrar(1, { cantidad: 2, fechaSalida: '2026-09-15T14:30:00-06:00' }, 42);

    expect(manager.findOne).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        where: { id: 1 },
        lock: { mode: 'pessimistic_write' },
      }),
    );
  });

  it('decrementa el stock y registra la salida con usuarioResponsableId/fechaRegistro server-side', async () => {
    const manager = buildManager({ inventario: { id: 1, stock: 10 } });
    const useCase = buildUseCase(manager);

    const resultado = await useCase.registrar(
      1,
      { cantidad: 4, fechaSalida: '2026-09-15T14:30:00-06:00' },
      42,
    );

    expect(resultado.stockResultante).toBe(6);
    expect(resultado.usuarioResponsableId).toBe(42);

    // El save del inventario refleja el stock ya decrementado.
    const saveCalls = manager.save.mock.calls;
    const saveInventario = saveCalls.find((c: any[]) => c[1]?.stock !== undefined);
    expect(saveInventario[1].stock).toBe(6);

    // La salida creada nunca trae usuarioResponsableId del dto (no existe
    // ese campo en RegistrarSalidaExistenciaDto) — viene solo del parámetro.
    const salidaCreada = manager.create.mock.results[0].value;
    expect(salidaCreada.usuarioResponsableId).toBe(42);
  });

  it('todo ocurre dentro de una única transacción (dataSource.transaction se llama una sola vez)', async () => {
    const manager = buildManager({ inventario: { id: 1, stock: 10 } });
    const dataSource = { transaction: jest.fn().mockImplementation((cb: any) => cb(manager)) };
    const useCase = new RegistrarSalidaExistenciaUseCase(dataSource as any);

    await useCase.registrar(1, { cantidad: 1, fechaSalida: '2026-09-15T14:30:00-06:00' }, 42);

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });

  it('lanza NotFoundException si la existencia no existe', async () => {
    const manager = buildManager({ inventario: null });
    const useCase = buildUseCase(manager);

    await expect(
      useCase.registrar(999, { cantidad: 1, fechaSalida: '2026-09-15T14:30:00-06:00' }, 42),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
