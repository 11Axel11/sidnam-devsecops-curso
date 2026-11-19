import { ConflictException, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Expediente_Residente } from 'src/modulos/residentes/entities/expedientes.entity';
import { aFechaISO } from './edad.helper';

/**
 * Fecha de nacimiento ('YYYY-MM-DD') del residente dueño del expediente, para calcular la edad «al
 * momento» de un registro (`edadMomentoControl`, y más adelante `edadMomentoEvaluacion` de Tinetti).
 *
 * El expediente llega al residente por `Expediente_Residente.residente` (OneToOne, FK
 * `residenteIdAdultoMayor`) → `Residente.fecha_nacimiento`. Una sola consulta que además comprueba RN-01:
 *  - 404 si el expediente no existe (nunca se crea implícitamente);
 *  - 409 si el expediente no tiene residente o fecha de nacimiento utilizable (no se inventa la edad).
 * La conversión a 'YYYY-MM-DD' usa componentes UTC (ver `aFechaISO`).
 */
export async function obtenerNacimientoDelResidente(m: EntityManager, expedienteId: number): Promise<string> {
  const expediente = await m.getRepository(Expediente_Residente).findOne({
    where: { id_expediente: expedienteId },
    relations: { residente: true },
    select: { id_expediente: true, residente: { id_adulto_mayor: true, fecha_nacimiento: true } },
  });
  if (!expediente) throw new NotFoundException(`Expediente ${expedienteId} no existe`);

  const nacimiento = expediente.residente?.fecha_nacimiento;
  const fecha = nacimiento ? new Date(nacimiento) : null;
  if (!fecha || Number.isNaN(fecha.getTime())) {
    throw new ConflictException(
      `El expediente ${expedienteId} no tiene la fecha de nacimiento del residente: no se puede calcular la edad`,
    );
  }
  return aFechaISO(fecha);
}
