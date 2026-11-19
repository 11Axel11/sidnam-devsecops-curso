import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Matches, Min } from 'class-validator';
import { ListarRegistrosDto } from 'src/common/dto/listar-registros.dto';
import { TextoLibre } from 'src/common/validators/texto-libre.decorator';

/** `YYYY-MM-DDTHH:mm[:ss[.fff]]` con `Z` u offset opcionales. Que sea una fecha real lo valida el servicio. */
const PATRON_FECHA_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})?$/;

/**
 * Cuerpo de POST /expedientes/:expedienteId/eventos-importantes-tf (RF-TF-07).
 *
 * NO acepta: `expedienteId` (va en la URL), `anulado`, campos de anulación ni de auditoría (el
 * ValidationPipe global usa forbidNonWhitelisted → 400). No existe DTO de PATCH: un evento no se edita;
 * se anula y se registra otro.
 */
export class CrearEventoImportanteDto {
  @ApiPropertyOptional({
    example: '2026-10-21T14:30',
    description:
      'ISO 8601. SIN zona se interpreta como hora de Costa Rica; con Z u offset se respeta. Por defecto ahora; no puede ser futura.',
  })
  @IsOptional()
  @Matches(PATRON_FECHA_HORA, { message: 'fechaHora debe ser una fecha y hora ISO 8601 (por ejemplo 2026-10-21T14:30)' })
  fechaHora?: string;

  @ApiProperty({ example: 1, description: 'Id en /catalogos/tipo-evento-importante (debe estar activo)' })
  @IsInt()
  @Min(1)
  tipoEventoId: number;

  @ApiPropertyOptional({ nullable: true, description: 'Obligatoria cuando el tipo es «Otro»' })
  @TextoLibre()
  descripcion?: string | null;
}

/** Filtros del listado: los comunes (`desde`, `hasta`, `incluirAnulados`) + el tipo de evento (CA-07). */
export class ListarEventosImportantesDto extends ListarRegistrosDto {
  @ApiPropertyOptional({ example: 1, description: 'Solo eventos de este tipo' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tipoEventoId?: number;
}
