import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';
import { SedeEnum } from 'src/common/enums/sede.enum';

// A.1.6: GET /inventario?sede=&categoria=&archivado=
// `sede` es obligatoria (RN-04) — si no viene, el ValidationPipe global ya
// responde 400 por @IsNotEmpty(). `categoria`/`archivado` son opcionales.
export class ListarExistenciasDto {
  @IsNotEmpty({ message: 'sede es obligatoria' })
  @IsEnum(SedeEnum, { message: 'sede debe ser hogar o cecuidam' })
  sede: SedeEnum;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoria?: number;

  // No usar @Type(() => Boolean): Boolean("false") === true, así que
  // ?archivado=false filtraría justo lo contrario. Se mapea el string a mano;
  // cualquier otro valor se deja tal cual para que @IsBoolean lo rechace (400).
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  archivado?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
