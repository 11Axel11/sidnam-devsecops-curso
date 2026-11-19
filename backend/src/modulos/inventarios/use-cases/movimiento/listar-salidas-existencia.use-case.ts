import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { And, LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import { Salida } from '../../entities/salida.entity';

// A.1.7: GET /inventario/:inventarioId/salidas?mes=
@Injectable()
export class ListarSalidasExistenciaUseCase {
  constructor(
    @InjectRepository(Salida)
    private readonly salidaRepo: Repository<Salida>,
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
      where.fechaSalida = And(MoreThanOrEqual(inicio), LessThan(fin));
    }

    const rows = await this.salidaRepo.find({
      where,
      relations: { usuarioResponsable: true },
      order: { fechaSalida: 'DESC' },
    });

    return rows.map((s) => ({
      id: s.id,
      cantidad: s.cantidad,
      fechaSalida: s.fechaSalida,
      fechaRegistro: s.fechaRegistro,
      usuarioResponsable: s.usuarioResponsable
        ? { id: s.usuarioResponsable.id, nombre: s.usuarioResponsable.name }
        : null,
    }));
  }
}
