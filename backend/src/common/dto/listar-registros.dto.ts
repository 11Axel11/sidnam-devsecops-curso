import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';
import { BooleanoQuery } from 'src/common/validators/booleano-query.decorator';

/**
 * Filtros comunes de los listados de registros clínicos sin máquina de estados (eventos importantes,
 * aplicaciones del test de movimiento, controles nutricionales). El formato se valida aquí; que sean
 * fechas reales y que `desde` no pase de `hasta` lo valida el servicio (`erroresDeRango`).
 *
 * A diferencia del historial de las valoraciones (que siempre incluye reemplazadas y anuladas), estos
 * listados EXCLUYEN los registros anulados por defecto: use `incluirAnulados=true` para verlos.
 */
export class ListarRegistrosDto {
  @ApiPropertyOptional({ example: '2026-01-01', description: 'YYYY-MM-DD, inclusivo (días de Costa Rica)' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'desde debe tener formato YYYY-MM-DD' })
  desde?: string;

  @ApiPropertyOptional({ example: '2026-12-31', description: 'YYYY-MM-DD, inclusivo (días de Costa Rica)' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'hasta debe tener formato YYYY-MM-DD' })
  hasta?: string;

  @ApiPropertyOptional({ default: false, description: 'true: incluye también los registros anulados (por defecto se excluyen)' })
  @BooleanoQuery()
  incluirAnulados?: boolean;
}
