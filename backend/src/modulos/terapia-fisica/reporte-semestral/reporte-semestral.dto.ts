import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

/** Quita caracteres de control, recorta y colapsa espacios; vacío ⇒ undefined (el parámetro se considera ausente). */
const limpiar = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  // eslint-disable-next-line no-control-regex
  const t = value.replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').replace(/\s+/g, ' ').trim();
  return t === '' ? undefined : t;
};

/** Letras (con tildes), dígitos, espacios y la puntuación habitual de un título y un código de colegiada. */
const TEXTO_SEGURO = /^[\p{L}\p{N} .,'()\-–—/#]+$/u;

export const MAX_PROFESIONAL_NOMBRE = 80;
export const MAX_PROFESIONAL_CODIGO = 30;

/**
 * Query de `GET reportes/terapia-fisica/semestral/pdf` (RF-TF-12). `profesionalNombre` y `profesionalCodigo` son
 * OPCIONALES, solo aparecen en el título del PDF y NO se guardan. Se sanitizan contra HTML: solo se admiten letras, dígitos
 * y puntuación simple (nada de `<`, `>`, `&`, comillas dobles ni caracteres de control), y además se escapan al imprimirse.
 */
export class ReporteSemestralQueryDto {
  @ApiProperty({ example: 2026, description: 'Año del periodo (2020 hasta el año actual)' })
  @Type(() => Number)
  @IsInt({ message: 'anio debe ser un entero' })
  @Min(2020, { message: 'anio no puede ser menor que 2020' })
  @Max(2100, { message: 'anio no puede ser mayor que 2100' })
  anio!: number;

  @ApiProperty({ example: 1, enum: [1, 2], description: '1 = enero–junio (Periodo I) · 2 = julio–diciembre (Periodo II)' })
  @Type(() => Number)
  @IsInt({ message: 'semestre debe ser 1 o 2' })
  @IsIn([1, 2], { message: 'semestre debe ser 1 o 2' })
  semestre!: 1 | 2;

  @ApiPropertyOptional({ example: 'Dra. Ana Mora Díaz', maxLength: MAX_PROFESIONAL_NOMBRE, description: 'Se imprime tal como se digita (con su título). No se guarda.' })
  @IsOptional()
  @Transform(limpiar)
  @IsString({ message: 'profesionalNombre debe ser texto' })
  @MaxLength(MAX_PROFESIONAL_NOMBRE, { message: `profesionalNombre no puede superar ${MAX_PROFESIONAL_NOMBRE} caracteres` })
  @Matches(TEXTO_SEGURO, { message: 'profesionalNombre solo admite letras, números, espacios y . , \' ( ) - / #' })
  profesionalNombre?: string;

  @ApiPropertyOptional({ example: 'CFT-12345', maxLength: MAX_PROFESIONAL_CODIGO, description: 'Código de colegiada. No se guarda.' })
  @IsOptional()
  @Transform(limpiar)
  @IsString({ message: 'profesionalCodigo debe ser texto' })
  @MaxLength(MAX_PROFESIONAL_CODIGO, { message: `profesionalCodigo no puede superar ${MAX_PROFESIONAL_CODIGO} caracteres` })
  @Matches(TEXTO_SEGURO, { message: 'profesionalCodigo solo admite letras, números, espacios y . , \' ( ) - / #' })
  profesionalCodigo?: string;
}
