import { interpretarBarthel } from './interpretarBarthel';

describe('interpretarBarthel', () => {
  it('puntaje 0 -> Dependencia Total', () => {
    expect(interpretarBarthel(0, false)).toBe('Dependencia Total');
  });

  it('puntaje 65 -> Dependencia Moderada', () => {
    expect(interpretarBarthel(65, false)).toBe('Dependencia Moderada');
  });

  it('puntaje 100 sin silla de ruedas -> Independencia', () => {
    expect(interpretarBarthel(100, false)).toBe('Independencia');
  });

  it('puntaje 90 con silla de ruedas -> Independencia — uso de silla de ruedas', () => {
    expect(interpretarBarthel(90, true)).toBe(
      'Independencia — uso de silla de ruedas',
    );
  });

  it('puntaje 90 sin silla de ruedas -> Dependencia Moderada (el caso especial NO aplica)', () => {
    expect(interpretarBarthel(90, false)).toBe('Dependencia Moderada');
  });

  // Casos adicionales para cubrir los bordes exactos de cada rango de la tabla.
  it('puntaje 20 (borde superior de Dependencia Total) -> Dependencia Total', () => {
    expect(interpretarBarthel(20, false)).toBe('Dependencia Total');
  });

  it('puntaje 21 (borde inferior de Dependencia Severa) -> Dependencia Severa', () => {
    expect(interpretarBarthel(21, false)).toBe('Dependencia Severa');
  });

  it('puntaje 60 (borde superior de Dependencia Severa) -> Dependencia Severa', () => {
    expect(interpretarBarthel(60, false)).toBe('Dependencia Severa');
  });

  it('puntaje 61 (borde inferior de Dependencia Moderada) -> Dependencia Moderada', () => {
    expect(interpretarBarthel(61, false)).toBe('Dependencia Moderada');
  });

  it('puntaje 91 (borde inferior de Dependencia Escasa) -> Dependencia Escasa', () => {
    expect(interpretarBarthel(91, false)).toBe('Dependencia Escasa');
  });

  it('puntaje 99 (borde superior de Dependencia Escasa) -> Dependencia Escasa', () => {
    expect(interpretarBarthel(99, false)).toBe('Dependencia Escasa');
  });
});
