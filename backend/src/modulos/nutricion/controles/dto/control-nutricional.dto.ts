import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Matches, Max, Min } from 'class-validator';
import { TextoLibre } from 'src/common/validators/texto-libre.decorator';
import { MAX_DECIMALES_MEDIDA, RANGOS_CONTROL } from '../control-nutricional.reglas';

type Rango = { min: number; max: number };

/** Número finito dentro de `rango` (inclusivo) y con a lo sumo 1 decimal. */
const Medida = (rango: Rango) =>
  applyDecorators(
    IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: MAX_DECIMALES_MEDIDA }),
    Min(rango.min),
    Max(rango.max),
  );

/** Igual que `Medida`, pero opcional: se puede omitir o enviar `null`. */
const MedidaOpcional = (rango: Rango) => applyDecorators(IsOptional(), Medida(rango));

/**
 * Cuerpo de POST /expedientes/:expedienteId/controles-nutricionales (RF-NU-01).
 *
 * NO acepta: `imc`, `edadMomentoControl` (los calcula el backend), `expedienteId`, `anulado`, campos de
 * anulación ni de auditoría (el ValidationPipe global usa forbidNonWhitelisted → 400). No existe un
 * DTO de PATCH: un control no se edita; se anula y se registra uno nuevo.
 *
 * Unidades: peso en kg · talla, CB, CP y AR en cm · FM en kgf. Hasta 1 decimal, dentro de rangos
 * razonables para una persona adulta mayor (ver `RANGOS_CONTROL`).
 */
export class CrearControlNutricionalDto {
  @ApiPropertyOptional({ example: '2026-10-21', description: 'YYYY-MM-DD. Por defecto hoy (Costa Rica); no puede ser futura.' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fecha debe tener formato YYYY-MM-DD' })
  fecha?: string;

  @ApiProperty({ example: 58.4, description: `kg, ${RANGOS_CONTROL.peso.min}–${RANGOS_CONTROL.peso.max}, hasta 1 decimal` })
  @Medida(RANGOS_CONTROL.peso)
  peso: number;

  @ApiProperty({ example: 152, description: `cm, ${RANGOS_CONTROL.talla.min}–${RANGOS_CONTROL.talla.max}, hasta 1 decimal` })
  @Medida(RANGOS_CONTROL.talla)
  talla: number;

  @ApiPropertyOptional({
    example: 27.5,
    nullable: true,
    description: `CB — circunferencia braquial, cm, ${RANGOS_CONTROL.circunferenciaBraquial.min}–${RANGOS_CONTROL.circunferenciaBraquial.max}`,
  })
  @MedidaOpcional(RANGOS_CONTROL.circunferenciaBraquial)
  circunferenciaBraquial?: number | null;

  @ApiPropertyOptional({
    example: 32,
    nullable: true,
    description: `CP — circunferencia de la pantorrilla, cm, ${RANGOS_CONTROL.circunferenciaPantorrilla.min}–${RANGOS_CONTROL.circunferenciaPantorrilla.max}`,
  })
  @MedidaOpcional(RANGOS_CONTROL.circunferenciaPantorrilla)
  circunferenciaPantorrilla?: number | null;

  @ApiPropertyOptional({
    example: 47.5,
    nullable: true,
    description: `AR — altura de la rodilla, cm, ${RANGOS_CONTROL.alturaRodilla.min}–${RANGOS_CONTROL.alturaRodilla.max}`,
  })
  @MedidaOpcional(RANGOS_CONTROL.alturaRodilla)
  alturaRodilla?: number | null;

  @ApiPropertyOptional({
    example: 18.5,
    nullable: true,
    description: `FM — fuerza muscular, kgf, ${RANGOS_CONTROL.fuerzaMuscular.min}–${RANGOS_CONTROL.fuerzaMuscular.max}`,
  })
  @MedidaOpcional(RANGOS_CONTROL.fuerzaMuscular)
  fuerzaMuscular?: number | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Interpretación digitada por la persona profesional (texto libre; el sistema no la calcula)',
  })
  @TextoLibre()
  interpretacion?: string | null;
}
