import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';
import { ItemDeInstrumento } from 'src/common/validators/item-instrumento.decorator';
import { TextoLibre } from 'src/common/validators/texto-libre.decorator';
import { PUNTOS_BARTHEL } from '../barthel-v1.instrumento';

const descripcion = (permitidos: number[]) => `Puntos de la opción elegida; solo ${permitidos.join(', ')} (ver el contrato)`;

/**
 * Cuerpo de POST /expedientes/:expedienteId/evaluaciones-barthel (RF-TF-08). Los DIEZ ítems son obligatorios
 * (la evaluación no puede cerrarse con parámetros sin responder) y cada uno admite SOLO los valores discretos
 * del Anexo A (`ITEMS_BARTHEL_V1`): ni puntuaciones libres ni enteros de un rango. `observaciones` es opcional.
 *
 * NO acepta: `puntajeTotal`, `gradoDependencia`, `versionInstrumento` (los calcula el backend), `expedienteId`,
 * `usuarioExaminadorId`, `anulado`, campos de anulación ni de auditoría (el ValidationPipe global usa
 * forbidNonWhitelisted → 400). No existe DTO de PATCH: una evaluación no se edita; se anula y se registra otra.
 */
export class CrearEvaluacionBarthelDto {
  @ApiPropertyOptional({ example: '2026-10-21', description: 'YYYY-MM-DD. Por defecto hoy (Costa Rica); no puede ser futura.' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fecha debe tener formato YYYY-MM-DD' })
  fecha?: string;

  @ApiProperty({ example: 10, description: descripcion(PUNTOS_BARTHEL.comer) })
  @ItemDeInstrumento(PUNTOS_BARTHEL.comer)
  comer: number;

  @ApiProperty({ example: 5, description: descripcion(PUNTOS_BARTHEL.lavarse) })
  @ItemDeInstrumento(PUNTOS_BARTHEL.lavarse)
  lavarse: number;

  @ApiProperty({ example: 10, description: descripcion(PUNTOS_BARTHEL.vestirse) })
  @ItemDeInstrumento(PUNTOS_BARTHEL.vestirse)
  vestirse: number;

  @ApiProperty({ example: 5, description: descripcion(PUNTOS_BARTHEL.arreglarse) })
  @ItemDeInstrumento(PUNTOS_BARTHEL.arreglarse)
  arreglarse: number;

  @ApiProperty({ example: 10, description: descripcion(PUNTOS_BARTHEL.deposiciones) })
  @ItemDeInstrumento(PUNTOS_BARTHEL.deposiciones)
  deposiciones: number;

  @ApiProperty({ example: 10, description: descripcion(PUNTOS_BARTHEL.miccion) })
  @ItemDeInstrumento(PUNTOS_BARTHEL.miccion)
  miccion: number;

  @ApiProperty({ example: 10, description: descripcion(PUNTOS_BARTHEL.usarRetrete) })
  @ItemDeInstrumento(PUNTOS_BARTHEL.usarRetrete)
  usarRetrete: number;

  @ApiProperty({ example: 15, description: descripcion(PUNTOS_BARTHEL.trasladarse) })
  @ItemDeInstrumento(PUNTOS_BARTHEL.trasladarse)
  trasladarse: number;

  @ApiProperty({ example: 15, description: `${descripcion(PUNTOS_BARTHEL.deambular)}. 5 = independiente en silla de ruedas` })
  @ItemDeInstrumento(PUNTOS_BARTHEL.deambular)
  deambular: number;

  @ApiProperty({ example: 10, description: descripcion(PUNTOS_BARTHEL.escalones) })
  @ItemDeInstrumento(PUNTOS_BARTHEL.escalones)
  escalones: number;

  @ApiPropertyOptional({ nullable: true, description: 'Observaciones de la persona examinadora (texto libre)' })
  @TextoLibre()
  observaciones?: string | null;
}
