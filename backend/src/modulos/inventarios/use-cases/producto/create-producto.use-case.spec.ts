import { CreateProductoUseCase } from './create-producto.use-case';
import { SedeEnum } from 'src/common/enums/sede.enum';

describe('CreateProductoUseCase (POST /inventario/productos legacy)', () => {
  it('delega en CrearExistenciaUseCase con sede=hogar y stock 0, y devuelve el producto', async () => {
    const productoGuardado = { id: 5, nombre: 'Arroz', codigo: 'AR-001' };
    const crearExistencia = {
      crearConDetalle: jest.fn().mockResolvedValue({
        producto: productoGuardado,
        inventario: {},
        unidadMedida: {},
        productoCreado: true,
      }),
    };
    const useCase = new CreateProductoUseCase(crearExistencia as any);

    const autorizar = jest.fn();
    const r = await useCase.crearProducto({
      nombre: 'Arroz',
      codigo: 'AR-001',
      unidadMedida: 4,
      categoriaId: 1,
      subcategoriaId: 2,
      imagen_url: 'http://x/y.png',
    }, autorizar);

    expect(crearExistencia.crearConDetalle).toHaveBeenCalledWith({
      producto: {
        nombre: 'Arroz',
        codigo: 'AR-001',
        categoriaId: 1,
        subcategoriaId: 2,
        imagen_url: 'http://x/y.png',
      },
      unidadMedidaId: 4,
      sede: SedeEnum.HOGAR,
      stockInicial: 0,
    }, autorizar);
    expect(r).toBe(productoGuardado);
  });
});
