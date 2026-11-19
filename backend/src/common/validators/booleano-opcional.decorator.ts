import { applyDecorators } from '@nestjs/common';
import { IsBoolean, ValidateIf } from 'class-validator';

/**
 * Booleano opcional de columna `NOT NULL`: omitirlo (`undefined`) es válido y la base aplica el
 * `default`, pero `null` se rechaza con 400 (`<campo> must be a boolean value`). `@IsOptional()` lo
 * dejaría pasar y MySQL respondería 500 (`Column 'x' cannot be null`).
 *
 * En los DTO de PATCH que extienden `PartialType(CrearDto, { skipNullProperties: false })` este
 * decorador se conserva; los textos y enteros opcionales mantienen su `@IsOptional()` y siguen
 * admitiendo `null` para limpiar el valor (regla 16 de docs/CLAUDE.md).
 *
 * OJO: los booleanos llegan en JSON; no usar `@Type(() => Boolean)` (convierte "false" en true).
 */
export const BooleanoOpcional = () =>
  applyDecorators(
    ValidateIf((_, valor: unknown) => valor !== undefined),
    IsBoolean(),
  );
