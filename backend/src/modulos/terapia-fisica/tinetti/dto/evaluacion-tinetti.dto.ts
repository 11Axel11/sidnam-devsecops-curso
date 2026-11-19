import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';
import { ItemDeInstrumento } from 'src/common/validators/item-instrumento.decorator';
import { TextoLibre } from 'src/common/validators/texto-libre.decorator';
import { PUNTOS_TINETTI } from '../tinetti-v1.instrumento';

const descripcion = (permitidos: number[]) => `Puntos de la opción elegida; solo ${permitidos.join(', ')} (ver el contrato)`;

/**
 * Cuerpo de POST /expedientes/:expedienteId/evaluaciones-tinetti (RF-TF-09). Los VEINTE ítems (diez de equilibrio y
 * diez de marcha) son obligatorios y cada uno admite SOLO los valores discretos del Anexo B (`ITEMS_TINETTI_V1`).
 * `observaciones` es opcional.
 *
 * NO acepta: `puntajeEquilibrio`, `puntajeMarcha`, `puntajeTotal`, `riesgoCaida`, `versionInstrumento`,
 * `edadMomentoEvaluacion`, `numeroControl` (los calcula/asigna el backend; la edición manual del número de control
 * sigue pendiente de la Jefatura, P8), `expedienteId`, `usuarioExaminadorId`, `anulado`, campos de anulación ni de
 * auditoría (el ValidationPipe global usa forbidNonWhitelisted → 400). No existe DTO de PATCH: una evaluación no se
 * edita; se anula y se registra otra.
 */
export class CrearEvaluacionTinettiDto {
  @ApiPropertyOptional({ example: '2026-10-21', description: 'YYYY-MM-DD. Por defecto hoy (Costa Rica); no puede ser futura.' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fecha debe tener formato YYYY-MM-DD' })
  fecha?: string;

  // ── Parte I — Equilibrio (Anexo B, Tabla 21) ──
  @ApiProperty({ example: 1, description: descripcion(PUNTOS_TINETTI.equilibrioSentado) })
  @ItemDeInstrumento(PUNTOS_TINETTI.equilibrioSentado)
  equilibrioSentado: number;

  @ApiProperty({ example: 1, description: descripcion(PUNTOS_TINETTI.levantarse) })
  @ItemDeInstrumento(PUNTOS_TINETTI.levantarse)
  levantarse: number;

  @ApiProperty({ example: 1, description: descripcion(PUNTOS_TINETTI.intentosLevantarse) })
  @ItemDeInstrumento(PUNTOS_TINETTI.intentosLevantarse)
  intentosLevantarse: number;

  @ApiProperty({ example: 1, description: descripcion(PUNTOS_TINETTI.equilibrioInmediato) })
  @ItemDeInstrumento(PUNTOS_TINETTI.equilibrioInmediato)
  equilibrioInmediato: number;

  @ApiProperty({ example: 1, description: descripcion(PUNTOS_TINETTI.equilibrioEnPie) })
  @ItemDeInstrumento(PUNTOS_TINETTI.equilibrioEnPie)
  equilibrioEnPie: number;

  @ApiProperty({ example: 1, description: descripcion(PUNTOS_TINETTI.empujon) })
  @ItemDeInstrumento(PUNTOS_TINETTI.empujon)
  empujon: number;

  @ApiProperty({ example: 1, description: descripcion(PUNTOS_TINETTI.ojosCerrados) })
  @ItemDeInstrumento(PUNTOS_TINETTI.ojosCerrados)
  ojosCerrados: number;

  @ApiProperty({ example: 1, description: descripcion(PUNTOS_TINETTI.giro360Continuidad) })
  @ItemDeInstrumento(PUNTOS_TINETTI.giro360Continuidad)
  giro360Continuidad: number;

  @ApiProperty({ example: 1, description: descripcion(PUNTOS_TINETTI.giro360Estabilidad) })
  @ItemDeInstrumento(PUNTOS_TINETTI.giro360Estabilidad)
  giro360Estabilidad: number;

  @ApiProperty({ example: 1, description: descripcion(PUNTOS_TINETTI.sentarse) })
  @ItemDeInstrumento(PUNTOS_TINETTI.sentarse)
  sentarse: number;

  // ── Parte II — Marcha (Anexo B, Tabla 22) ──
  @ApiProperty({ example: 1, description: descripcion(PUNTOS_TINETTI.inicioMarcha) })
  @ItemDeInstrumento(PUNTOS_TINETTI.inicioMarcha)
  inicioMarcha: number;

  @ApiProperty({ example: 1, description: descripcion(PUNTOS_TINETTI.longitudPasoDerecho) })
  @ItemDeInstrumento(PUNTOS_TINETTI.longitudPasoDerecho)
  longitudPasoDerecho: number;

  @ApiProperty({ example: 1, description: descripcion(PUNTOS_TINETTI.alturaPasoDerecho) })
  @ItemDeInstrumento(PUNTOS_TINETTI.alturaPasoDerecho)
  alturaPasoDerecho: number;

  @ApiProperty({ example: 1, description: descripcion(PUNTOS_TINETTI.longitudPasoIzquierdo) })
  @ItemDeInstrumento(PUNTOS_TINETTI.longitudPasoIzquierdo)
  longitudPasoIzquierdo: number;

  @ApiProperty({ example: 1, description: descripcion(PUNTOS_TINETTI.alturaPasoIzquierdo) })
  @ItemDeInstrumento(PUNTOS_TINETTI.alturaPasoIzquierdo)
  alturaPasoIzquierdo: number;

  @ApiProperty({ example: 1, description: descripcion(PUNTOS_TINETTI.simetriaPaso) })
  @ItemDeInstrumento(PUNTOS_TINETTI.simetriaPaso)
  simetriaPaso: number;

  @ApiProperty({ example: 1, description: descripcion(PUNTOS_TINETTI.continuidadPasos) })
  @ItemDeInstrumento(PUNTOS_TINETTI.continuidadPasos)
  continuidadPasos: number;

  @ApiProperty({ example: 1, description: descripcion(PUNTOS_TINETTI.trayectoria) })
  @ItemDeInstrumento(PUNTOS_TINETTI.trayectoria)
  trayectoria: number;

  @ApiProperty({ example: 1, description: descripcion(PUNTOS_TINETTI.tronco) })
  @ItemDeInstrumento(PUNTOS_TINETTI.tronco)
  tronco: number;

  @ApiProperty({ example: 1, description: descripcion(PUNTOS_TINETTI.posturaMarcha) })
  @ItemDeInstrumento(PUNTOS_TINETTI.posturaMarcha)
  posturaMarcha: number;

  @ApiPropertyOptional({ nullable: true, description: 'Observaciones de la persona examinadora (texto libre)' })
  @TextoLibre()
  observaciones?: string | null;
}
