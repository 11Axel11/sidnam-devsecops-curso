import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, ArrayUnique, IsArray, IsInt, IsOptional, Matches, Min, ValidateNested } from 'class-validator';
import { TextoCorto, TextoObligatorio } from 'src/common/validators/texto-libre.decorator';

/**
 * Resultado de UN ejercicio. Los tres campos de texto son DESCRIPTIVOS: el instrumento no define escalas ni
 * valores predefinidos (Anexo C.3). `modalidad` y `resultado` son obligatorios; `modificacion` es opcional.
 */
export class EjercicioAplicadoDto {
  @ApiProperty({ example: 1, description: 'Id en /catalogos/ejercicio-test-movimiento (debe estar activo)' })
  @IsInt()
  @Min(1)
  ejercicioId: number;

  @ApiProperty({ example: 'Con apoyo de bastón', description: 'Texto descriptivo, obligatorio, máx. 255' })
  @TextoObligatorio(255)
  modalidad: string;

  @ApiPropertyOptional({ example: 'Silla con apoyabrazos', nullable: true, description: 'Texto descriptivo, opcional, máx. 255' })
  @TextoCorto(255)
  modificacion?: string | null;

  @ApiProperty({ example: 'Lo realiza en 12 segundos', description: 'Texto descriptivo, obligatorio, máx. 255' })
  @TextoObligatorio(255)
  resultado: string;
}

/**
 * Cuerpo de POST /expedientes/:expedienteId/aplicaciones-test-movimiento (RF-TF-10). Cabecera + detalle
 * en una sola petición y una sola transacción (todo o nada).
 *
 * `ejercicios` debe traer exactamente un elemento por cada ejercicio ACTIVO del catálogo; esa
 * comparación con el catálogo la hace el servicio (`400 { errores }`). NO acepta `expedienteId`,
 * `usuarioResponsableId`, `anulado` ni campos de auditoría. No existe PATCH: no se sobrescribe una
 * aplicación; se anula y se registra otra.
 */
export class CrearAplicacionTestMovimientoDto {
  @ApiPropertyOptional({ example: '2026-10-21', description: 'YYYY-MM-DD. Por defecto hoy (Costa Rica); no puede ser futura.' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fecha debe tener formato YYYY-MM-DD' })
  fecha?: string;

  @ApiProperty({ type: [EjercicioAplicadoDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique((e: EjercicioAplicadoDto) => e.ejercicioId, {
    message: 'ejercicios no admite el mismo ejercicioId repetido',
  })
  @ValidateNested({ each: true })
  @Type(() => EjercicioAplicadoDto)
  ejercicios: EjercicioAplicadoDto[];
}
