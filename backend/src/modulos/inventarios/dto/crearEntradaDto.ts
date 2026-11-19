import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsInt, IsOptional, Min, ValidateNested } from 'class-validator';

export class CrearEntradaProductoDto {
  @IsInt()
  inventarioId: number;

  @IsInt()
  @Min(1, { message: 'La cantidad debe ser mayor a 0' })
  cantidad: number;
}

export class CrearEntradaDto {
  @IsArray({ message: 'productos debe ser un arreglo' })
  @ValidateNested({ each: true })
  @Type(() => CrearEntradaProductoDto)
  productos: CrearEntradaProductoDto[];

  // NUEVO (Tarea A.1.3, RF-IN-09). Obligatorio en el DTO aunque la columna
  // sea nullable en el esquema (esa nulabilidad es solo para no romper
  // filas históricas, no una regla de negocio). Aplica una sola vez a todo
  // el lote de entradas que se registra en esta petición.
  //
  // NO se agrega `usuarioResponsableId` acá: nunca debe venir del body. Se
  // resuelve server-side desde request.user.id (mismo mecanismo que
  // Auditable.creadoPorId, ver src/common/auditoria/), en la tarea de
  // servicio A.1.7.
  // Opcional e IGNORADO: la fecha de registro siempre la fija el servidor (hora
  // actual). Se sigue aceptando para no romper a los clientes que la envían.
  @IsOptional()
  @IsDateString()
  fechaRegistro?: string;
}