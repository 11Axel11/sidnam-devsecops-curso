/**
 * Nivel de deterioro cognitivo de la valoración nutricional (RF-NU-04): lista CERRADA decidida por la
 * Jefatura (octubre 2026). Solo aplica con `estadoCognitivo = con_deterioro`.
 *
 * Se guarda en la columna `varchar(255)` que ya existía (cuando era texto libre): no es un `enum` de MySQL
 * a propósito, para no emitir ningún `ALTER` sobre bases que ya tienen filas con texto libre. La lista se
 * cierra en el DTO (`@IsIn`), que es la única puerta de escritura.
 */
export const NIVELES_DETERIORO_COGNITIVO = ['leve', 'moderado', 'severo'] as const;

export type NivelDeterioroCognitivo = (typeof NIVELES_DETERIORO_COGNITIVO)[number];
