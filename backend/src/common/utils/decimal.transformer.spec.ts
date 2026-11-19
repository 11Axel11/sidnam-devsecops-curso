/* eslint-disable @typescript-eslint/unbound-method -- el transformer es un objeto literal de funciones flecha, sin `this` */
import { DECIMAL_A_NUMERO } from './decimal.transformer';

describe('DECIMAL_A_NUMERO', () => {
  const from = DECIMAL_A_NUMERO.from as (v?: string | number | null) => number | null;
  const to = DECIMAL_A_NUMERO.to as (v?: number | null) => number | null | undefined;

  it('convierte el string decimal de MySQL en number', () => {
    expect(from('58.4')).toBe(58.4);
    expect(from('152.0')).toBe(152);
    expect(from('0.0')).toBe(0);
  });

  it('respeta null y undefined (columna nullable) devolviendo null', () => {
    expect(from(null)).toBeNull();
    expect(from(undefined)).toBeNull();
  });

  it('un number ya convertido se conserva', () => {
    expect(from(25.3)).toBe(25.3);
  });

  it('al escribir no transforma (el DTO ya validó rango y decimales)', () => {
    expect(to(58.4)).toBe(58.4);
    expect(to(null)).toBeNull();
    expect(to(undefined)).toBeUndefined();
  });
});
