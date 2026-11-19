// dto/crearSalidaDto.ts
import { Type } from 'class-transformer';
import { IsArray, ValidateNested, ArrayMinSize, IsInt, Min, IsDateString, IsOptional } from 'class-validator';



export class CrearSalidaItemDto {
  @IsInt()
  @Min(1, { message: 'El inventarioId debe ser mayor que 0' })
  inventarioId: number;

  @IsInt()
  @Min(1, { message: 'La cantidad debe ser mayor a 0' })
  cantidad: number;
}

export class CrearSalidaDto {
  @IsArray({ message: 'productos debe ser un arreglo' })
  @ArrayMinSize(1, { message: 'Debe incluir al menos un producto' })
  @ValidateNested({ each: true })
  @Type(() => CrearSalidaItemDto)
  productos: CrearSalidaItemDto[];

  // NUEVO (Tarea A.1.3, RF-IN-09). Obligatorio en el DTO aunque la columna
  // sea nullable en el esquema (esa nulabilidad es solo para no romper
  // filas históricas, no una regla de negocio). Aplica una sola vez a todo
  // el lote de salidas que se registra en esta petición.
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
