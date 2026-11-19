import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Cuerpo de todo `PATCH /:id/anular` del Bloque B: la anulación exige justificación (RN-02). */
export class AnularRegistroDto {
  @ApiProperty({ example: 'Se cargó en el expediente equivocado' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  motivo: string;
}
