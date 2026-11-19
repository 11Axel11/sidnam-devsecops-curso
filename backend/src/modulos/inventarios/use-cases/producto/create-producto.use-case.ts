import { Injectable } from "@nestjs/common";
import { Producto } from "../../entities/producto.entity";
import { ProductoDto } from "../../dto/crearProductoDto";
import { SedeEnum } from "src/common/enums/sede.enum";
import { AutorizarCategoria, CrearExistenciaUseCase } from "../existencia/crear-existencia.use-case";


@Injectable()
export class CreateProductoUseCase {
  constructor(
    private readonly crearExistenciaUseCase: CrearExistenciaUseCase,
  ){}

    // Endpoint legacy (POST /inventario/productos): se mantiene para Hogar,
    // pero ya no tiene lógica propia — delega en CrearExistenciaUseCase con
    // sede=hogar, el mismo camino que POST /inventario (producto + existencia
    // en una sola transacción, sin duplicar productos por código).
    //
    // Cambio de comportamiento respecto a antes: si el `codigo` ya existía
    // respondía 400. Ahora el producto existente se reutiliza (p. ej. uno que
    // hoy solo existe en CECUIDAM gana una existencia en Hogar), y solo
    // responde 409 si ya tiene existencia en Hogar.
    async crearProducto(producto: ProductoDto, autorizar?: AutorizarCategoria): Promise<Producto>{
        const resultado = await this.crearExistenciaUseCase.crearConDetalle({
          producto: {
            nombre: producto.nombre,
            codigo: producto.codigo,
            categoriaId: producto.categoriaId,
            subcategoriaId: producto.subcategoriaId,
            imagen_url: producto.imagen_url,
          },
          unidadMedidaId: producto.unidadMedida,
          sede: SedeEnum.HOGAR,
          stockInicial: 0,
        }, autorizar);

        return resultado.producto;
    }

}
