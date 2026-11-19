import { errorDescripcionSiOtro, esTipoOtro } from './tipo-otro.helper';

describe('esTipoOtro', () => {
  it('compara con la constante sin mayúsculas ni espacios', () => {
    expect(esTipoOtro('Otro', 'Otro')).toBe(true);
    expect(esTipoOtro('  otro ', 'Otro')).toBe(true);
    expect(esTipoOtro('OTRO', 'Otro')).toBe(true);
    expect(esTipoOtro('Caída', 'Otro')).toBe(false);
    expect(esTipoOtro('Otros', 'Otro')).toBe(false);
  });

  it('usa la constante que se le pasa (cada catálogo tiene la suya)', () => {
    expect(esTipoOtro('Misceláneo', 'Misceláneo')).toBe(true);
    expect(esTipoOtro('Otro', 'Misceláneo')).toBe(false);
  });
});

describe('errorDescripcionSiOtro', () => {
  it('para un tipo distinto de «Otro» la descripción es opcional', () => {
    expect(errorDescripcionSiOtro('Caída', null, 'Otro')).toBeNull();
    expect(errorDescripcionSiOtro('Caída', undefined, 'Otro')).toBeNull();
  });

  it('«Otro» sin descripción (null, undefined, vacía o en blanco) es error', () => {
    const esperado = 'descripcion es obligatoria cuando el tipo es "Otro"';
    expect(errorDescripcionSiOtro('Otro', null, 'Otro')).toBe(esperado);
    expect(errorDescripcionSiOtro('Otro', undefined, 'Otro')).toBe(esperado);
    expect(errorDescripcionSiOtro('Otro', '', 'Otro')).toBe(esperado);
    expect(errorDescripcionSiOtro('Otro', '   ', 'Otro')).toBe(esperado);
  });

  it('«Otro» con descripción es válido', () => {
    expect(errorDescripcionSiOtro('Otro', 'Mareo al levantarse', 'Otro')).toBeNull();
  });
});
