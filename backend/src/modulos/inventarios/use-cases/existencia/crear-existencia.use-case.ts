import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Inventario } from '../../entities/inventario.entity';
import { Producto } from '../../entities/producto.entity';
import { Subcategoria_Producto } from '../../entities/subCategoriaProducto.entity';
import { Unidad_Medida } from 'src/modulos/unidades-medida/entities/unidadMedida.entity';
import { CrearExistenciaDto, ProductoNuevoDto } from '../../dto/crearExistenciaDto';
import {
  CategoriasPrincipalesProductos,
  getCategoriasId,
} from 'src/common/enums/categoriasPrincipalesProductos.enum';

// Verificación de permiso que el llamador (controller) inyecta: se ejecuta con la
// categoría REAL del producto resultante, antes de escribir la existencia. Así
// no se puede declarar una categoría permitida para un `codigo` que en la base
// pertenece a otra categoría.
export type AutorizarCategoria = (categoria: CategoriasPrincipalesProductos) => Promise<void>;

export interface ResultadoCrearExistencia {
  inventario: Inventario;
  producto: Producto;
  unidadMedida: Unidad_Medida;
  productoCreado: boolean;
}

// POST /inventario (A.1.6) y, por delegación, el POST /inventario/productos
// legacy (siempre con sede=hogar).
//
// Reglas:
//  - Nunca se duplica: `producto.codigo` es único en todo el catálogo y
//    (producto, sede) es único en `inventario`. Si el código ya existe GANA
//    el producto existente (se devuelve el que quedó, sin tocarlo).
//  - Producto + existencia se escriben en UNA transacción: no quedan
//    productos huérfanos sin existencia si algo falla a mitad.
//  - La unidad de medida es por existencia: puede variar entre sedes. Si no
//    se envía y el producto ya tiene existencias, hereda la de la primera.
//  - Condiciones de carrera: ambos únicos de la base son el respaldo real;
//    el error de duplicado (ER_DUP_ENTRY) se traduce a "reutilizar el
//    producto" (si fue el código) o a 409 (si fue producto+sede).
@Injectable()
export class CrearExistenciaUseCase {
  constructor(private readonly dataSource: DataSource) {}

  async crear(dto: CrearExistenciaDto, autorizar?: AutorizarCategoria) {
    const r = await this.crearConDetalle(dto, autorizar);
    return {
      id: r.inventario.id,
      producto: {
        id: r.producto.id,
        nombre: r.producto.nombre,
        codigo: r.producto.codigo,
      },
      unidadMedida: {
        id: r.unidadMedida.id_unidad,
        nombre: r.unidadMedida.nombre,
        abreviatura: r.unidadMedida.abreviatura,
      },
      sede: r.inventario.sede,
      stock: r.inventario.stock,
      archivado: r.inventario.archivado,
      productoCreado: r.productoCreado,
    };
  }

  async crearConDetalle(
    dto: CrearExistenciaDto,
    autorizar?: AutorizarCategoria,
  ): Promise<ResultadoCrearExistencia> {
    const tieneId = dto.productoId !== undefined && dto.productoId !== null;
    const tieneBloque = !!dto.producto;
    if (tieneId === tieneBloque) {
      throw new BadRequestException(
        'Indique productoId (producto ya existente) o producto (datos para buscarlo/crearlo por código), pero no ambos ni ninguno.',
      );
    }

    // READ COMMITTED: tras un ER_DUP_ENTRY por carrera, el SELECT de
    // reintento debe ver la fila que la otra petición ya confirmó; con el
    // aislamiento por defecto (REPEATABLE READ) vería el snapshot viejo y no
    // la encontraría.
    return this.dataSource.transaction('READ COMMITTED', async (manager) => {
      const inventarioRepo = manager.getRepository(Inventario);
      const productoRepo = manager.getRepository(Producto);

      let producto: Producto | null;
      let productoCreado = false;

      if (tieneId) {
        producto = await productoRepo.findOne({ where: { id: dto.productoId } });
        if (!producto) {
          throw new NotFoundException(`Producto ${dto.productoId} no encontrado`);
        }
        await autorizar?.(producto.categoriaTipo);
      } else {
        const datos = dto.producto as ProductoNuevoDto;
        producto = await productoRepo.findOne({ where: { codigo: datos.codigo } });
        if (producto) {
          await autorizar?.(producto.categoriaTipo);
        } else {
          if (dto.unidadMedidaId === undefined || dto.unidadMedidaId === null) {
            throw new BadRequestException(
              'unidadMedidaId es obligatoria para un producto nuevo.',
            );
          }
          const r = await this.crearProducto(manager, datos, autorizar);
          producto = r.producto;
          productoCreado = r.creado;
        }
      }

      const unidadMedida = await this.resolverUnidad(manager, producto, dto.unidadMedidaId);

      const existente = await inventarioRepo.findOne({
        where: { producto: { id: producto.id }, sede: dto.sede },
      });
      if (existente) {
        this.lanzarConflicto(existente.id);
      }

      const nuevo = inventarioRepo.create({
        producto,
        unidad_medida: unidadMedida,
        sede: dto.sede,
        stock: dto.stockInicial ?? 0,
        archivado: false,
      });

      try {
        const inventario = await inventarioRepo.save(nuevo);
        return { inventario, producto, unidadMedida, productoCreado };
      } catch (err) {
        if (this.esErrorDeDuplicado(err)) {
          const ganador = await inventarioRepo.findOne({
            where: { producto: { id: producto.id }, sede: dto.sede },
          });
          this.lanzarConflicto(ganador?.id);
        }
        throw err;
      }
    });
  }

  private async crearProducto(
    manager: EntityManager,
    datos: ProductoNuevoDto,
    autorizar?: AutorizarCategoria,
  ): Promise<{ producto: Producto; creado: boolean }> {
    const productoRepo = manager.getRepository(Producto);

    const categoriaTipo = getCategoriasId(datos.categoriaId);
    if (!categoriaTipo) {
      throw new BadRequestException(`Categoría inválida: ${datos.categoriaId}`);
    }
    await autorizar?.(categoriaTipo);

    let subcategoria: Subcategoria_Producto | null = null;
    if (datos.subcategoriaId !== undefined && datos.subcategoriaId !== null) {
      subcategoria = await manager
        .getRepository(Subcategoria_Producto)
        .findOne({ where: { id: datos.subcategoriaId } });
      if (!subcategoria) {
        throw new NotFoundException(`Subcategoría ${datos.subcategoriaId} no encontrada`);
      }
    }

    const nuevo = productoRepo.create({
      nombre: datos.nombre,
      codigo: datos.codigo,
      categoriaTipo,
      subcategoria: subcategoria ?? null,
      imagen_url: datos.imagen_url ?? null,
    } as any) as unknown as Producto;

    try {
      return { producto: await productoRepo.save(nuevo), creado: true };
    } catch (err) {
      // Otra petición creó el mismo código entre nuestro SELECT y el INSERT:
      // gana el producto que ya quedó, se reutiliza.
      if (this.esErrorDeDuplicado(err)) {
        const ganador = await productoRepo.findOne({ where: { codigo: datos.codigo } });
        if (ganador) {
          await autorizar?.(ganador.categoriaTipo);
          return { producto: ganador, creado: false };
        }
      }
      throw err;
    }
  }

  private async resolverUnidad(
    manager: EntityManager,
    producto: Producto,
    unidadMedidaId?: number,
  ): Promise<Unidad_Medida> {
    if (unidadMedidaId !== undefined && unidadMedidaId !== null) {
      const unidad = await manager
        .getRepository(Unidad_Medida)
        .findOne({ where: { id_unidad: unidadMedidaId } });
      if (!unidad) {
        throw new NotFoundException(`Unidad de medida ${unidadMedidaId} no encontrada`);
      }
      return unidad;
    }

    // Sin unidad explícita: hereda la de la primera existencia del producto.
    const primera = await manager.getRepository(Inventario).findOne({
      where: { producto: { id: producto.id } },
      relations: { unidad_medida: true },
      order: { id: 'ASC' },
    });
    if (!primera?.unidad_medida) {
      throw new BadRequestException(
        'unidadMedidaId es obligatoria: el producto todavía no tiene ninguna existencia de la cual heredarla.',
      );
    }
    return primera.unidad_medida;
  }

  private esErrorDeDuplicado(err: any): boolean {
    const codigo = err?.code ?? err?.driverError?.code;
    return codigo === 'ER_DUP_ENTRY';
  }

  private lanzarConflicto(inventarioExistenteId?: number): never {
    throw new ConflictException({
      statusCode: 409,
      message: 'Ya existe una existencia para este producto en la sede indicada.',
      inventarioExistenteId,
    });
  }
}
