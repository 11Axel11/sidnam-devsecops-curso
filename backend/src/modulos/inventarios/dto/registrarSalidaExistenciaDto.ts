import { IsDateString, IsInt, IsNotEmpty, Min } from 'class-validator';

// A.1.7: POST /inventario/:inventarioId/salidas
// `usuarioResponsableId` y `fechaRegistro` NO van acá: se completan
// server-side desde el usuario autenticado (ver InventarioController).
export class RegistrarSalidaExistenciaDto {
  @IsNotEmpty()
  @IsInt()
  @Min(1, { message: 'La cantidad debe ser mayor a 0' })
  cantidad: number;

  @IsNotEmpty()
  @IsDateString()
  fechaSalida: string;
}
