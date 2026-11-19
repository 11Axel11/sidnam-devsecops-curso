import { interpretarTinetti } from './interpretarTinetti';

describe('interpretarTinetti', () => {
  it('puntaje 10 (< 19) -> Riesgo alto de caídas', () => {
    expect(interpretarTinetti(10)).toBe('Riesgo alto de caídas');
  });

  it('puntaje 21 (19-23) -> Riesgo de caídas', () => {
    expect(interpretarTinetti(21)).toBe('Riesgo de caídas');
  });

  it('puntaje 26 (24-28) -> Riesgo bajo o leve', () => {
    expect(interpretarTinetti(26)).toBe('Riesgo bajo o leve');
  });

  // Casos adicionales para cubrir los bordes exactos de cada rango.
  it('puntaje 18 (borde superior de riesgo alto) -> Riesgo alto de caídas', () => {
    expect(interpretarTinetti(18)).toBe('Riesgo alto de caídas');
  });

  it('puntaje 19 (borde inferior de riesgo de caídas) -> Riesgo de caídas', () => {
    expect(interpretarTinetti(19)).toBe('Riesgo de caídas');
  });

  it('puntaje 23 (borde superior de riesgo de caídas) -> Riesgo de caídas', () => {
    expect(interpretarTinetti(23)).toBe('Riesgo de caídas');
  });

  it('puntaje 24 (borde inferior de riesgo bajo) -> Riesgo bajo o leve', () => {
    expect(interpretarTinetti(24)).toBe('Riesgo bajo o leve');
  });

  it('puntaje 28 (máximo) -> Riesgo bajo o leve', () => {
    expect(interpretarTinetti(28)).toBe('Riesgo bajo o leve');
  });
});
