import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

// `text` de MySQL admite 65 535 BYTES; con tildes (2 bytes) 20 000 caracteres cabe de sobra y
// supera por mucho los >2000 que exige CA-06. Evita un 500 de la base con textos descomunales.
export const MAX_TEXTO_LIBRE = 20000;

const recortarOVacioANull = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  const t = value.trim();
  return t === '' ? null : t;
};

/** Texto largo opcional (`text`): se recorta; vacío → null (permite limpiar el campo con PATCH). */
export const TextoLibre = () =>
  applyDecorators(IsOptional(), Transform(recortarOVacioANull), IsString(), MaxLength(MAX_TEXTO_LIBRE));

/** Texto corto opcional (`varchar(max)`): igual que TextoLibre con un tope menor. */
export const TextoCorto = (max = 255) =>
  applyDecorators(IsOptional(), Transform(recortarOVacioANull), IsString(), MaxLength(max));

const recortar = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);

/**
 * Texto corto OBLIGATORIO (`varchar(max)`): se recorta y no admite vacío ni `null`. Para campos como
 * `modalidad` y `resultado` del test de movimiento (RF-TF-10), que el instrumento deja como texto
 * descriptivo pero exige.
 */
export const TextoObligatorio = (max = 255) =>
  applyDecorators(Transform(recortar), IsString(), IsNotEmpty(), MaxLength(max));
