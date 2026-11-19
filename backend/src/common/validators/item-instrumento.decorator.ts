import { applyDecorators } from '@nestjs/common';
import { IsIn, IsOptional, ValidationArguments } from 'class-validator';

/**
 * Ítem de un instrumento clínico (Barthel, Tinetti, y más adelante MNA): solo se admite UNO de los valores
 * discretos definidos por el instrumento (RN-05: no se digitan puntuaciones libres). Es obligatorio: un
 * valor ausente, `null`, decimal, texto o fuera de la lista responde con un único mensaje
 * `<campo> debe ser uno de los valores permitidos: …` (los valores en el orden en que se pasan).
 *
 * Pensado para recibir los puntos de la constante única del instrumento (p. ej. `BARTHEL_V1`), de modo que
 * DTO, calculadora y contrato salgan de la misma tabla.
 */
export const ItemDeInstrumento = (valores: readonly number[]): PropertyDecorator =>
  IsIn(valores, {
    message: (args: ValidationArguments) => `${args.property} debe ser uno de los valores permitidos: ${valores.join(', ')}`,
  });

/**
 * Igual que `ItemDeInstrumento`, pero OMISIBLE: ausente o `null` se aceptan en el formato (la regla de si el
 * ítem es obligatorio la aplica el servicio, p. ej. la segunda parte del MNA o un ítem que se deriva de un
 * control vinculado). Cuando viene un valor, solo se admite uno de los de la lista. Los valores pueden ser
 * decimales (0,5): la comparación es numérica exacta.
 */
export const ItemDeInstrumentoOpcional = (valores: readonly number[]): PropertyDecorator =>
  applyDecorators(IsOptional(), ItemDeInstrumento(valores));
