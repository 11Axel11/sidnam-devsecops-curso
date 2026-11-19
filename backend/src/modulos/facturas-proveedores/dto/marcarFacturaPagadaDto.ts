import { IsDateString, IsOptional } from 'class-validator';

// PATCH facturas/estado/:id — body OPCIONAL (el endpoint existente se llamaba
// sin body; sigue funcionando: si no se envía fecha, se usa la de hoy).
export class MarcarFacturaPagadaDto {
  // Fecha en que se pagó realmente (ISO 8601, ej. "2026-09-18"). No puede ser
  // anterior a la emisión de la factura ni futura.
  @IsOptional()
  @IsDateString()
  fecha_pagada?: string;
}
