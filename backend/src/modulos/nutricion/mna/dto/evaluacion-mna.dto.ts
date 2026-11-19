import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Matches, Min } from 'class-validator';
import { ItemDeInstrumento, ItemDeInstrumentoOpcional } from 'src/common/validators/item-instrumento.decorator';
import { PUNTOS_MNA } from '../mna-v1.instrumento';

const descripcion = (permitidos: number[]) => `Puntos de la opción elegida; solo ${permitidos.join(', ')} (ver el contrato)`;

/**
 * Cuerpo de POST /expedientes/:expedienteId/evaluaciones-mna (registro) y de
 * POST /expedientes/:expedienteId/evaluaciones-mna/calcular (vista previa sin guardar): el MISMO DTO (RF-NU-03).
 *
 * - Cribaje A–E obligatorios. `itemF` se omite si se vincula un control (`controlNutricionalId`), de cuyo IMC se
 *   deriva; sin vínculo es obligatorio. G–R aceptan ausente/`null` en el formato; si son obligatorios (cribaje < 12) o
 *   deben ir completos (cribaje ≥ 12) lo decide el servicio (`400 { errores }`).
 * - Cada ítem admite SOLO los valores discretos del Anexo D (`ITEMS_MNA_V1`; K, M, P y Q con medios puntos).
 *
 * NO acepta: `subtotalCribaje`, `interpretacionCribaje`, `subtotalEvaluacion`, `evaluacionGlobal`,
 * `interpretacionGlobal`, `versionInstrumento` (los calcula el backend), `expedienteId`, `usuarioResponsableId`,
 * `anulado`, campos de anulación ni de auditoría (el ValidationPipe global usa forbidNonWhitelisted → 400). No
 * existe DTO de PATCH: una evaluación no se edita; se anula y se registra otra.
 */
export class CrearEvaluacionMnaDto {
  @ApiPropertyOptional({ example: '2026-10-21', description: 'YYYY-MM-DD. Por defecto hoy (Costa Rica); no puede ser futura.' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fecha debe tener formato YYYY-MM-DD' })
  fecha?: string;

  @ApiPropertyOptional({ example: 12, nullable: true, description: 'Id de un control nutricional NO anulado del mismo expediente, no posterior a la fecha de la evaluación, del que se toma el IMC del ítem F' })
  @IsOptional()
  @IsInt()
  @Min(1)
  controlNutricionalId?: number | null;

  // ── Primera parte — Cribaje (Anexo D, Tabla 26) ──
  @ApiProperty({ example: 1, description: descripcion(PUNTOS_MNA.itemA) })
  @ItemDeInstrumento(PUNTOS_MNA.itemA)
  itemA: number;

  @ApiProperty({ example: 2, description: descripcion(PUNTOS_MNA.itemB) })
  @ItemDeInstrumento(PUNTOS_MNA.itemB)
  itemB: number;

  @ApiProperty({ example: 1, description: descripcion(PUNTOS_MNA.itemC) })
  @ItemDeInstrumento(PUNTOS_MNA.itemC)
  itemC: number;

  @ApiProperty({ example: 2, description: descripcion(PUNTOS_MNA.itemD) })
  @ItemDeInstrumento(PUNTOS_MNA.itemD)
  itemD: number;

  @ApiProperty({ example: 1, description: descripcion(PUNTOS_MNA.itemE) })
  @ItemDeInstrumento(PUNTOS_MNA.itemE)
  itemE: number;

  @ApiPropertyOptional({ example: 3, nullable: true, description: `${descripcion(PUNTOS_MNA.itemF)}. Con controlNutricionalId se deriva del IMC del control (un valor distinto se rechaza); sin vínculo es obligatorio.` })
  @ItemDeInstrumentoOpcional(PUNTOS_MNA.itemF)
  itemF?: number | null;

  // ── Segunda parte — Evaluación (Anexo D, Tabla 28): obligatoria con cribaje < 12; con cribaje ≥ 12 se omite completa o se envía completa ──
  @ApiPropertyOptional({ example: 1, description: descripcion(PUNTOS_MNA.itemG), nullable: true })
  @ItemDeInstrumentoOpcional(PUNTOS_MNA.itemG)
  itemG?: number | null;

  @ApiPropertyOptional({ example: 1, description: descripcion(PUNTOS_MNA.itemH), nullable: true })
  @ItemDeInstrumentoOpcional(PUNTOS_MNA.itemH)
  itemH?: number | null;

  @ApiPropertyOptional({ example: 1, description: descripcion(PUNTOS_MNA.itemI), nullable: true })
  @ItemDeInstrumentoOpcional(PUNTOS_MNA.itemI)
  itemI?: number | null;

  @ApiPropertyOptional({ example: 2, description: descripcion(PUNTOS_MNA.itemJ), nullable: true })
  @ItemDeInstrumentoOpcional(PUNTOS_MNA.itemJ)
  itemJ?: number | null;

  @ApiPropertyOptional({ example: 0.5, description: descripcion(PUNTOS_MNA.itemK), nullable: true })
  @ItemDeInstrumentoOpcional(PUNTOS_MNA.itemK)
  itemK?: number | null;

  @ApiPropertyOptional({ example: 1, description: descripcion(PUNTOS_MNA.itemL), nullable: true })
  @ItemDeInstrumentoOpcional(PUNTOS_MNA.itemL)
  itemL?: number | null;

  @ApiPropertyOptional({ example: 0.5, description: descripcion(PUNTOS_MNA.itemM), nullable: true })
  @ItemDeInstrumentoOpcional(PUNTOS_MNA.itemM)
  itemM?: number | null;

  @ApiPropertyOptional({ example: 2, description: descripcion(PUNTOS_MNA.itemN), nullable: true })
  @ItemDeInstrumentoOpcional(PUNTOS_MNA.itemN)
  itemN?: number | null;

  @ApiPropertyOptional({ example: 2, description: descripcion(PUNTOS_MNA.itemO), nullable: true })
  @ItemDeInstrumentoOpcional(PUNTOS_MNA.itemO)
  itemO?: number | null;

  @ApiPropertyOptional({ example: 1, description: descripcion(PUNTOS_MNA.itemP), nullable: true })
  @ItemDeInstrumentoOpcional(PUNTOS_MNA.itemP)
  itemP?: number | null;

  @ApiPropertyOptional({ example: 1, description: descripcion(PUNTOS_MNA.itemQ), nullable: true })
  @ItemDeInstrumentoOpcional(PUNTOS_MNA.itemQ)
  itemQ?: number | null;

  @ApiPropertyOptional({ example: 1, description: descripcion(PUNTOS_MNA.itemR), nullable: true })
  @ItemDeInstrumentoOpcional(PUNTOS_MNA.itemR)
  itemR?: number | null;
}
