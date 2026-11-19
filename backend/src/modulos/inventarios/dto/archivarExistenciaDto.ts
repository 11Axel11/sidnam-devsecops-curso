import { IsBoolean, IsNotEmpty } from 'class-validator';

// A.1.6: PATCH /inventario/:id/archivar
export class ArchivarExistenciaDto {
  @IsNotEmpty()
  @IsBoolean()
  archivado: boolean;
}
