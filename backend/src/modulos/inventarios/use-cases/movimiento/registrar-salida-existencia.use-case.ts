import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Inventario } from '../../entities/inventario.entity';
import { Salida } from '../../entities/salida.entity';
import { RegistrarSalidaExistenciaDto } from '../../dto/registrarSalidaExistenciaDto';

// A.1.7: POST /inventario/:inventarioId/salidas
// Requisito de concurrencia — no se omite: el SELECT del stock, la
// validación de suficiencia, el UPDATE del stock y el INSERT de la salida
// ocurren dentro de UNA transacción, con el SELECT bajo bloqueo pesimista
// (`lock: { mode: 'pessimistic_write' }`, equivalente a SELECT ... FOR
// UPDATE) para que dos salidas simultáneas sobre el mismo inventario_id no
// puedan dejar el stock en negativo por una condición de carrera.
@Injectable()
export class RegistrarSalidaExistenciaUseCase {
  constructor(private readonly dataSource: DataSource) {}

  async registrar(
    inventarioId: number,
    dto: RegistrarSalidaExistenciaDto,
    usuarioResponsableId: number,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const inventario = await manager.findOne(Inventario, {
        where: { id: inventarioId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!inventario) {
        throw new NotFoundException(`Existencia ${inventarioId} no encontrada`);
      }

      if (dto.cantidad > inventario.stock) {
        throw new UnprocessableEntityException({
          statusCode: 422,
          message: 'Stock insuficiente.',
          stockDisponible: inventario.stock,
          cantidadSolicitada: dto.cantidad,
        });
      }

      const ahora = new Date();

      const salida = manager.create(Salida, {
        cantidad: dto.cantidad,
        fechaSalida: new Date(dto.fechaSalida),
        fechaRegistro: ahora,
        usuarioResponsableId,
        inventario,
      });
      const guardada = await manager.save(Salida, salida);

      inventario.stock -= dto.cantidad;
      await manager.save(Inventario, inventario);

      return {
        salidaId: guardada.id,
        inventarioId: inventario.id,
        cantidad: dto.cantidad,
        stockResultante: inventario.stock,
        usuarioResponsableId,
        fechaRegistro: ahora,
      };
    });
  }
}
