import { calcularImc, redondearUnDecimal } from './calcular-imc';

/**
 * Casos documentados de la fórmula (RNF-07: al menos tres, validables con el departamento):
 *   IMC = peso (kg) / (talla (cm) / 100)², redondeado a 1 decimal.
 */
describe('calcularImc', () => {
  it('CA-14: 58,4 kg y 152 cm ⇒ 25,3', () => {
    expect(calcularImc(58.4, 152)).toBe(25.3);
  });

  it('extremo bajo del rango clínico: 20 kg y 220 cm ⇒ 4,1', () => {
    expect(calcularImc(20, 220)).toBe(4.1); // 20 / 4,84 = 4,132…
  });

  it('extremo alto del rango clínico: 250 kg y 100 cm ⇒ 250,0', () => {
    expect(calcularImc(250, 100)).toBe(250);
  });

  it('valor intermedio habitual: 70 kg y 165 cm ⇒ 25,7', () => {
    expect(calcularImc(70, 165)).toBe(25.7); // 70 / 2,7225 = 25,711…
  });

  it('IMC exacto, sin decimales: 64 kg y 160 cm ⇒ 25,0', () => {
    expect(calcularImc(64, 160)).toBe(25);
  });

  it('la talla se interpreta en CENTÍMETROS (no en metros)', () => {
    expect(calcularImc(60, 150)).toBe(26.7); // 60 / 2,25
    expect(calcularImc(60, 1.5)).not.toBe(26.7);
  });

  it('redondea la mitad hacia arriba SIN ruido de coma flotante (200 cm ⇒ IMC = peso / 4)', () => {
    expect(calcularImc(80.2, 200)).toBe(20.1); // 20,05 exacto ⇒ 20,1
    expect(calcularImc(80.6, 200)).toBe(20.2); // 20,15 exacto ⇒ 20,2 (con double saldría 20,1)
    expect(calcularImc(80.4, 200)).toBe(20.1); // 20,10 exacto
  });

  it('redondea al décimo más cercano en el caso general', () => {
    expect(calcularImc(52.3, 148.5)).toBe(23.7); // 52,3 / 2,205225 = 23,717…
    expect(calcularImc(95, 175)).toBe(31); // 31,020… ⇒ 31,0
  });

  it('con más de un decimal en la entrada usa coma flotante (la función es pública)', () => {
    expect(calcularImc(58.43, 152.04)).toBe(25.3);
  });

  it.each([
    [0, 150],
    [-5, 150],
    [60, 0],
    [60, -1],
    [Number.NaN, 150],
    [60, Number.POSITIVE_INFINITY],
  ])('rechaza peso=%p y talla=%p', (peso, talla) => {
    expect(() => calcularImc(peso, talla)).toThrow(RangeError);
  });
});

describe('redondearUnDecimal', () => {
  it('redondea a 1 decimal', () => {
    expect(redondearUnDecimal(25.277)).toBe(25.3);
    expect(redondearUnDecimal(25.24)).toBe(25.2);
    expect(redondearUnDecimal(-1.7000000000000028)).toBe(-1.7);
  });

  it('no devuelve -0', () => {
    expect(Object.is(redondearUnDecimal(-0.0000001), 0)).toBe(true);
    expect(Object.is(redondearUnDecimal(0), 0)).toBe(true);
  });
});
