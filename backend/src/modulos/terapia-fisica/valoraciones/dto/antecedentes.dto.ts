import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsInt, Min, ValidateNested } from 'class-validator';
import { TextoCorto, TextoLibre } from 'src/common/validators/texto-libre.decorator';

/** Estado de UN ítem del catálogo de antecedentes personales. */
export class AntecedentePersonalItemDto {
  @ApiProperty({ example: 1, description: 'Id del ítem en /catalogos/antecedente-personal (debe estar activo)' })
  @IsInt()
  @Min(1)
  antecedenteId: number;

  @ApiProperty({ example: true, description: 'true = presente; false = evaluado y descartado' })
  @IsBoolean()
  presente: boolean;

  @ApiPropertyOptional({ example: 'Diagnosticada en 2019', nullable: true })
  @TextoLibre()
  observacion?: string | null;
}

/**
 * Cuerpo de POST …/antecedentes-personales. Sin cantidad fija de ítems: el
 * frontend envía el estado de TODOS los ítems activos del catálogo (RF-TF-02);
 * el backend hace upsert por (valoracionId, antecedenteId). No exige enviar
 * todos (guardado parcial); la completitud se valida al CONFIRMAR.
 */
export class RegistrarAntecedentesPersonalesDto {
  @ApiProperty({ type: [AntecedentePersonalItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique((a: AntecedentePersonalItemDto) => a.antecedenteId, {
    message: 'antecedentes no admite el mismo antecedenteId repetido',
  })
  @ValidateNested({ each: true })
  @Type(() => AntecedentePersonalItemDto)
  antecedentes: AntecedentePersonalItemDto[];
}

/** Cuerpo de POST …/antecedentes-traumaticos: un registro independiente. */
export class CrearAntecedenteTraumaticoDto {
  @ApiProperty({ example: 1, description: 'Id en /catalogos/tipo-antecedente-traumatico (debe estar activo)' })
  @IsInt()
  @Min(1)
  tipoId: number;

  @ApiPropertyOptional({ nullable: true, description: 'Obligatoria cuando el tipo es «Otro»' })
  @TextoLibre()
  descripcion?: string | null;

  @ApiPropertyOptional({ example: 'Cadera derecha', nullable: true })
  @TextoCorto(255)
  localizacionAnatomica?: string | null;

  @ApiPropertyOptional({ example: 'Hace 3 años', nullable: true })
  @TextoCorto(255)
  tiempoTranscurrido?: string | null;
}

/**
 * PATCH /antecedentes-traumaticos/:id — parcial, solo con la valoración en borrador.
 * `tipoId` es obligatorio en la columna: `null` se rechaza con 400 (`skipNullProperties: false`);
 * los textos conservan su `IsOptional` y siguen admitiendo `null` para limpiarse.
 */
export class ActualizarAntecedenteTraumaticoDto extends PartialType(CrearAntecedenteTraumaticoDto, {
  skipNullProperties: false,
}) {}
