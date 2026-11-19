import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { Inventario } from '../../entities/inventario.entity';
import { ListarExistenciasDto } from '../../dto/listarExistenciasDto';
import { CategoriasPrincipalesProductos, getCategoriasId } from 'src/common/enums/categoriasPrincipalesProductos.enum';

// A.1.6: GET /inventario?sede=&categoria=&archivado=
@Injectable()
export class ListarExistenciasUseCase {
  constructor(
    @InjectRepository(Inventario)
    private readonly inventarioRepo: Repository<Inventario>,
  ) {}

  // `categoriasPermitidas`: si no se pide una categoría concreta, el listado se
  // limita a las categorías sobre las que el rol tiene permiso de Ver.
  async listar(dto: ListarExistenciasDto, categoriasPermitidas?: CategoriasPrincipalesProductos[]) {
    const where: FindOptionsWhere<Inventario> = { sede: dto.sede };

    if (dto.categoria !== undefined) {
      const categoriaTipo = getCategoriasId(dto.categoria);
      if (!categoriaTipo) {
        throw new BadRequestException(`Categoría inválida: ${dto.categoria}`);
      }
      where.producto = { categoriaTipo };
    } else if (categoriasPermitidas) {
      where.producto = { categoriaTipo: In(categoriasPermitidas) };
    }

    if (dto.archivado !== undefined) {
      where.archivado = dto.archivado;
    }

    const [rows, total] = await this.inventarioRepo.findAndCount({
      where,
      relations: { producto: true, unidad_medida: true },
      order: { id: 'DESC' },
      skip: dto.page && dto.limit ? (dto.page - 1) * dto.limit : 0,
      take: dto.limit,
    });

    return {
      data: rows.map((i) => this.formatear(i)),
      total,
    };
  }

  private formatear(i: Inventario) {
    return {
      id: i.id,
      producto: i.producto
        ? { id: i.producto.id, nombre: i.producto.nombre, codigo: i.producto.codigo }
        : null,
      unidadMedida: i.unidad_medida
        ? {
            id: i.unidad_medida.id_unidad,
            nombre: i.unidad_medida.nombre,
            abreviatura: i.unidad_medida.abreviatura,
          }
        : null,
      sede: i.sede,
      stock: i.stock,
      archivado: i.archivado,
    };
  }
}
