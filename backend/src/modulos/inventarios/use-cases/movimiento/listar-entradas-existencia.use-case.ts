import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { And, LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import { Entrada } from '../../entities/entrada.entity';

// A.1.7: GET /inventario/:inventarioId/entradas?mes=
@Injectable()
export class ListarEntradasExistenciaUseCase {
  constructor(
    @InjectRepository(Entrada)
    private readonly entradaRepo: Repository<Entrada>,
  ) {}

  async listar(inventarioId: number, mes?: string) {
    const where: any = { inventario: { id: inventarioId } };

    if (mes) {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) {
        throw new BadRequestException('mes debe tener formato YYYY-MM (ej. 2026-09)');
      }
      const [anio, mesNum] = mes.split('-').map(Number);
      const inicio = new Date(anio, mesNum - 1, 1);
      const fin = new Date(anio, mesNum, 1);
      // [inicio, fin): el primer instante del mes siguiente NO pertenece al mes.
      where.fechaEntrada = And(MoreThanOrEqual(inicio), LessThan(fin));
    }

    const rows = await this.entradaRepo.find({
      where,
      relations: { usuarioResponsable: true },
      order: { fechaEntrada: 'DESC' },
    });

    return rows.map((e) => ({
      id: e.id,
      cantidad: e.cantidad,
      fechaEntrada: e.fechaEntrada,
      fechaRegistro: e.fechaRegistro,
      usuarioResponsable: e.usuarioResponsable
        ? { id: e.usuarioResponsable.id, nombre: e.usuarioResponsable.name }
        : null,
    }));
  }
}
