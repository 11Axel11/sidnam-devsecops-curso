import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Inventario } from '../../entities/inventario.entity';
import { Entrada } from '../../entities/entrada.entity';
import { RegistrarEntradaExistenciaDto } from '../../dto/registrarEntradaExistenciaDto';

// A.1.7: POST /inventario/:inventarioId/entradas
// Requisito de concurrencia (mismo criterio que la salida, por consistencia,
// aunque acá no hay riesgo de negativo): SELECT con bloqueo pesimista,
// INSERT de la entrada y UPDATE del stock dentro de una única transacción.
@Injectable()
export class RegistrarEntradaExistenciaUseCase {
  constructor(private readonly dataSource: DataSource) {}

  async registrar(
    inventarioId: number,
    dto: RegistrarEntradaExistenciaDto,
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

      const ahora = new Date();

      const entrada = manager.create(Entrada, {
        cantidad: dto.cantidad,
        fechaEntrada: new Date(dto.fechaEntrada),
        fechaRegistro: ahora,
        usuarioResponsableId,
        inventario,
      });
      const guardada = await manager.save(Entrada, entrada);

      inventario.stock += dto.cantidad;
      await manager.save(Inventario, inventario);

      return {
        entradaId: guardada.id,
        inventarioId: inventario.id,
        cantidad: dto.cantidad,
        stockResultante: inventario.stock,
        usuarioResponsableId,
        fechaRegistro: ahora,
      };
    });
  }
}
