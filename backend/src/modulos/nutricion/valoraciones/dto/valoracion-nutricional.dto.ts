import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsIn, IsInt, IsOptional, Matches, Min, ValidateIf } from 'class-validator';
import { BooleanoOpcional } from 'src/common/validators/booleano-opcional.decorator';
import { TextoLibre } from 'src/common/validators/texto-libre.decorator';
import { EstadoCognitivo } from '../../enums/estado-cognitivo.enum';
import { NivelDeterioroCognitivo, NIVELES_DETERIORO_COGNITIVO } from '../../enums/nivel-deterioro-cognitivo';

/**
 * Cuerpo de POST. Todo es opcional porque la valoración nace en `borrador` y admite guardado parcial
 * (RNF-08). NO acepta: estado, anulado, expedienteId, usuarioResponsableId ni campos de auditoría
 * (el ValidationPipe global usa forbidNonWhitelisted → 400). Lo obligatorio se valida al CONFIRMAR.
 *
 * Los booleanos y `estadoCognitivo` son columnas NOT NULL con default: omitirlos es válido, pero
 * `null` se rechaza con 400 (regla 16 de docs/CLAUDE.md). `datoFuncionalId`, el detalle y el nivel
 * sí admiten `null` para limpiarse.
 */
export class CrearValoracionNutricionalDto {
  @ApiPropertyOptional({ example: '2026-10-21', description: 'YYYY-MM-DD. Por defecto hoy; no puede ser futura.' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fecha debe tener formato YYYY-MM-DD' })
  fecha?: string;

  @ApiPropertyOptional({ description: 'Problema visual (sí/no)' }) @BooleanoOpcional() problemaVisual?: boolean;
  @ApiPropertyOptional({ description: 'Problema de cavidad oral (sí/no)' }) @BooleanoOpcional() problemaCavidadOral?: boolean;

  @ApiPropertyOptional({ description: 'Alergia a medicamentos (sí/no)' }) @BooleanoOpcional() alergiaMedicamentos?: boolean;
  @ApiPropertyOptional({ nullable: true, description: '«Cuáles». Solo con alergiaMedicamentos = true; obligatorio al confirmar si hay alergia.' })
  @TextoLibre()
  detalleAlergiaMedicamentos?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 2,
    description: 'Id en /catalogos/dato-funcional-nutricion (debe estar activo al asignarlo). Obligatorio para confirmar.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  datoFuncionalId?: number | null;

  @ApiPropertyOptional({ enum: EstadoCognitivo, example: 'con_deterioro' })
  @ValidateIf((_, valor: unknown) => valor !== undefined)
  @IsEnum(EstadoCognitivo)
  estadoCognitivo?: EstadoCognitivo;

  @ApiPropertyOptional({
    enum: NIVELES_DETERIORO_COGNITIVO,
    nullable: true,
    example: 'leve',
    description: 'Nivel del deterioro (lista cerrada). Solo con estadoCognitivo = con_deterioro; obligatorio al confirmar en ese caso. null lo limpia.',
  })
  @IsOptional()
  @IsIn(NIVELES_DETERIORO_COGNITIVO, {
    message: `nivelDeterioroCognitivo must be one of the following values: ${NIVELES_DETERIORO_COGNITIVO.join(', ')}`,
  })
  nivelDeterioroCognitivo?: NivelDeterioroCognitivo | null;

  @ApiPropertyOptional({ description: 'Depresión (sí/no)' }) @BooleanoOpcional() depresion?: boolean;
  @ApiPropertyOptional({ description: 'Ansiedad (sí/no)' }) @BooleanoOpcional() ansiedad?: boolean;
}

/**
 * PATCH /:id — mismos campos, todos opcionales; solo mientras esté en borrador.
 * `skipNullProperties: false` conserva el `ValidateIf(v !== undefined)` de los booleanos y de
 * `estadoCognitivo` (null → 400); los textos y `datoFuncionalId` conservan `IsOptional` y admiten
 * `null` para limpiarse.
 */
export class ActualizarValoracionNutricionalDto extends PartialType(CrearValoracionNutricionalDto, {
  skipNullProperties: false,
}) {}
