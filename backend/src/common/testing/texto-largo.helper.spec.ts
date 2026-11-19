import { generarTextoLargo } from './texto-largo.helper';

describe('generarTextoLargo', () => {
  it('genera un texto de más de 2000 caracteres por defecto', () => {
    const texto = generarTextoLargo();
    expect(texto.length).toBeGreaterThan(2000);
  });

  it('respeta la longitud pedida exactamente', () => {
    expect(generarTextoLargo(2500)).toHaveLength(2500);
    expect(generarTextoLargo(10)).toHaveLength(10);
    expect(generarTextoLargo(1)).toHaveLength(1);
  });

  it('es determinista: la misma longitud siempre da el mismo texto', () => {
    expect(generarTextoLargo(2500)).toBe(generarTextoLargo(2500));
  });

  it('devuelve string vacío para longitud 0 o negativa', () => {
    expect(generarTextoLargo(0)).toBe('');
    expect(generarTextoLargo(-5)).toBe('');
  });
});
