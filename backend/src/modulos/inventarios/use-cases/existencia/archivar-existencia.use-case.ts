import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventario } from '../../entities/inventario.entity';

// A.1.6: PATCH /inventario/:id/archivar — archiva/desarchiva ÚNICAMENTE la
// fila de Inventario indicada (una sede), nunca ambas sedes del mismo
// producto a la vez. Esta es la implementación que resuelve el TODO dejado
// en update-producto.use-case.ts (Producto.archivado sigue existiendo mientras
// haya código que dependa de él, pero está @deprecated y no se toca acá).
@Injectable()
export class ArchivarExistenciaUseCase {
  constructor(
    @InjectRepository(Inventario)
    private readonly inventarioRepo: Repository<Inventario>,
  ) {}

  async archivar(id: number, archivado: boolean) {
    const inventario = await this.inventarioRepo.findOne({ where: { id } });
    if (!inventario) {
      throw new NotFoundException(`Existencia ${id} no encontrada`);
    }

    inventario.archivado = archivado;
    await this.inventarioRepo.save(inventario);

    return {
      id: inventario.id,
      sede: inventario.sede,
      archivado: inventario.archivado,
    };
  }
}
