import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventario } from '../../entities/inventario.entity';

// A.1.6: GET /inventario/:id — detalle con producto y unidadMedida.
@Injectable()
export class DetalleExistenciaUseCase {
  constructor(
    @InjectRepository(Inventario)
    private readonly inventarioRepo: Repository<Inventario>,
  ) {}

  async obtener(id: number) {
    const inventario = await this.inventarioRepo.findOne({
      where: { id },
      relations: { producto: { subcategoria: true }, unidad_medida: true },
    });

    if (!inventario) {
      throw new NotFoundException(`Existencia ${id} no encontrada`);
    }

    return {
      id: inventario.id,
      producto: inventario.producto
        ? {
            id: inventario.producto.id,
            nombre: inventario.producto.nombre,
            codigo: inventario.producto.codigo,
            categoriaTipo: inventario.producto.categoriaTipo,
            imagenUrl: inventario.producto.imagen_url ?? null,
            subcategoriaId: inventario.producto.subcategoria?.id ?? null,
          }
        : null,
      unidadMedida: inventario.unidad_medida
        ? {
            id: inventario.unidad_medida.id_unidad,
            nombre: inventario.unidad_medida.nombre,
            abreviatura: inventario.unidad_medida.abreviatura,
          }
        : null,
      sede: inventario.sede,
      stock: inventario.stock,
      archivado: inventario.archivado,
    };
  }
}
