import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CaracteristicaDolor } from '../../enums/caracteristicaDolor.enum';
import { BooleanoOpcional } from 'src/common/validators/booleano-opcional.decorator';
import { TextoLibre } from 'src/common/validators/texto-libre.decorator';

/**
 * Cuerpo de POST. Todo es opcional porque la valoración nace en `borrador`
 * y admite guardado parcial (RNF-08). NO acepta: estado, anulado, expedienteId,
 * usuarioResponsableId, ni campos de auditoría (el ValidationPipe global usa
 * forbidNonWhitelisted → 400). Lo obligatorio se valida al CONFIRMAR.
 */
export class CrearValoracionFisioterapeuticaDto {
  @ApiPropertyOptional({ example: '2026-09-15', description: 'YYYY-MM-DD. Por defecto hoy; no puede ser futura.' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fecha debe tener formato YYYY-MM-DD' })
  fecha?: string;

  @ApiPropertyOptional() @TextoLibre() otrosDiagnosticos?: string | null;

  @ApiPropertyOptional() @BooleanoOpcional() antecedentesCaidas?: boolean;
  @ApiPropertyOptional() @TextoLibre() detalleCaidas?: string | null;

  @ApiPropertyOptional() @BooleanoOpcional() usoAyudasBiomecanicas?: boolean;
  @ApiPropertyOptional() @TextoLibre() detalleAyudasBiomecanicas?: string | null;

  @ApiPropertyOptional() @BooleanoOpcional() presentaDolor?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value))
  @IsString()
  @MaxLength(255)
  zonaDolorosa?: string | null;

  @ApiPropertyOptional({ enum: CaracteristicaDolor, isArray: true, example: ['punzante', 'irradiado'] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(CaracteristicaDolor, { each: true })
  caracteristicasDolor?: CaracteristicaDolor[] | null;

  @ApiPropertyOptional({ example: 'Hacia el miembro inferior derecho' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value))
  @IsString()
  @MaxLength(255)
  direccionIrradiacion?: string | null;

  @ApiPropertyOptional({ minimum: 1, maximum: 10, description: 'Entero 1–10; solo si presentaDolor' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  intensidadDolor?: number | null;

  @ApiPropertyOptional() @BooleanoOpcional() orientacionPersona?: boolean;
  @ApiPropertyOptional() @BooleanoOpcional() orientacionEspacio?: boolean;
  @ApiPropertyOptional() @BooleanoOpcional() orientacionTiempo?: boolean;
  @ApiPropertyOptional({ description: 'Valoración global explícita; NO se deduce de las tres orientaciones' })
  @BooleanoOpcional()
  conscienteOrientado?: boolean;

  @ApiPropertyOptional() @TextoLibre() cambiosConductuales?: string | null;
  @ApiPropertyOptional() @TextoLibre() estadosAnimo?: string | null;

  @ApiPropertyOptional() @TextoLibre() rangoMovimiento?: string | null;
  @ApiPropertyOptional() @TextoLibre() fuerzaMuscularDinamometria?: string | null;
  @ApiPropertyOptional() @TextoLibre() postura?: string | null;
  @ApiPropertyOptional() @TextoLibre() riesgoUlcera?: string | null;
  @ApiPropertyOptional() @TextoLibre() diagnosticoDiferencial?: string | null;
  @ApiPropertyOptional() @TextoLibre() tratamiento?: string | null;

  @ApiPropertyOptional({ nullable: true, description: '«Avances» (RF-TF-12): texto abierto opcional, máx. 20 000. No se exige para confirmar; null lo limpia.' })
  @TextoLibre()
  avances?: string | null;
}

/**
 * PATCH /:id — mismos campos, todos opcionales; solo mientras esté en borrador.
 * `skipNullProperties: false` hace que PartialType use `ValidateIf(v !== undefined)` en vez de
 * `IsOptional`: sin eso, `null` pasaría en los booleanos NOT NULL (→ 500). Los textos/enteros
 * conservan su propio `IsOptional` y siguen admitiendo `null` para limpiar el valor.
 */
export class ActualizarValoracionFisioterapeuticaDto extends PartialType(CrearValoracionFisioterapeuticaDto, {
  skipNullProperties: false,
}) {}
