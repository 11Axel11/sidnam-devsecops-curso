import { IsDateString, IsInt, IsNotEmpty, Min } from 'class-validator';

// A.1.7: POST /inventario/:inventarioId/entradas
// `usuarioResponsableId` y `fechaRegistro` NO van acá: se completan
// server-side desde el usuario autenticado (ver InventarioController).
// `fechaEntrada` sí la manda el cliente (es un dato de negocio, no de
// auditoría) — se mantiene el nombre ya usado en el resto del módulo.
export class RegistrarEntradaExistenciaDto {
  @IsNotEmpty()
  @IsInt()
  @Min(1, { message: 'La cantidad debe ser mayor a 0' })
  cantidad: number;

  @IsNotEmpty()
  @IsDateString()
  fechaEntrada: string;
}
