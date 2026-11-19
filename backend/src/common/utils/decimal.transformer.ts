import { ValueTransformer } from 'typeorm';

/**
 * Las columnas `decimal` de MySQL llegan como string ('58.4'). Este transformer las devuelve como
 * `number` (y respeta null) para que las respuestas JSON traigan números y no cadenas. Al escribir no
 * transforma: el valor ya viene validado (rango y decimales) desde el DTO.
 */
export const DECIMAL_A_NUMERO: ValueTransformer = {
  to: (valor?: number | null) => valor,
  from: (valor?: string | number | null) => (valor === null || valor === undefined ? null : Number(valor)),
};
