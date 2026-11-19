import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

/**
 * Booleano OPCIONAL de un query string (`?incluirAnulados=true`). Los query params llegan como texto:
 * 'true'/'false' se convierten y cualquier otra cosa se rechaza con 400.
 *
 * OJO: no usar `@Type(() => Boolean)` — convierte el string "false" en true.
 */
export const BooleanoQuery = () =>
  applyDecorators(
    IsOptional(),
    Transform(({ value }: { value: unknown }) =>
      value === 'true' || value === true ? true : value === 'false' || value === false ? false : value,
    ),
    IsBoolean(),
  );
