import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Cuerpo de POST. Solo `nombre`: `activo` nace en true y los campos de
 * auditoría salen de `req.user` (el ValidationPipe global usa
 * forbidNonWhitelisted, así que un `creadoPorId` en el body se rechaza con 400).
 */
export class CrearCatalogoDto {
  @ApiProperty({ example: 'Diabetes mellitus' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre: string;
}

export class ListarCatalogoDto {
  @ApiPropertyOptional({
    description:
      'true (por defecto): solo ítems activos, para los desplegables de los formularios. ' +
      'false: incluye inactivos (administración; requiere Catalogos:Ver).',
    default: true,
  })
  @IsOptional()
  // OJO: no usar `@Type(() => Boolean)`: convierte el string "false" en true.
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' || value === true ? true : value === 'false' || value === false ? false : value,
  )
  @IsBoolean()
  soloActivos?: boolean;
}
