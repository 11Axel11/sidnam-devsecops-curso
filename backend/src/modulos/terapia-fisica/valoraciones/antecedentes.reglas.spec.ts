import { TIPO_ANTECEDENTE_TRAUMATICO_OTRO, TIPOS_ANTECEDENTE_TRAUMATICO } from 'src/modulos/catalogos/seed/catalogos-iniciales';
import { antecedentesPersonalesPendientes, errorDescripcionOtro, esTipoOtro } from './antecedentes.reglas';

describe('antecedentes — reglas puras', () => {
  describe('«Otro» (RF-TF-03)', () => {
    it('se identifica con la constante del catálogo, sin mayúsculas ni espacios', () => {
      expect(TIPO_ANTECEDENTE_TRAUMATICO_OTRO).toBe('Otro');
      expect(esTipoOtro(TIPO_ANTECEDENTE_TRAUMATICO_OTRO)).toBe(true);
      expect(esTipoOtro('  otro ')).toBe(true);
      expect(esTipoOtro('OTRO')).toBe(true);
      expect(esTipoOtro('Fractura')).toBe(false);
      expect(esTipoOtro('Otros')).toBe(false);
    });

    it('la semilla del catálogo incluye el tipo «Otro» (la regla depende de él)', () => {
      expect(TIPOS_ANTECEDENTE_TRAUMATICO.some(esTipoOtro)).toBe(true);
    });

    it('«Otro» sin descripción (null, undefined, vacía o en blanco) → error', () => {
      for (const d of [null, undefined, '', '   ']) {
        expect(errorDescripcionOtro('Otro', d)).toMatch(/obligatoria/);
      }
    });

    it('«Otro» con descripción → sin error; otros tipos nunca la exigen', () => {
      expect(errorDescripcionOtro('Otro', 'Contusión por atropello')).toBeNull();
      expect(errorDescripcionOtro('Fractura', null)).toBeNull();
      expect(errorDescripcionOtro('Cirugía', undefined)).toBeNull();
    });
  });

  describe('antecedentesPersonalesPendientes (lo que exige confirmar)', () => {
    const activos = [
      { id: 1, nombre: 'Hipertensión arterial' },
      { id: 2, nombre: 'Cáncer' },
      { id: 3, nombre: 'Diabetes' },
    ];

    it('todos pendientes cuando no se evaluó ninguno', () => {
      expect(antecedentesPersonalesPendientes(activos, [])).toEqual(activos);
    });

    it('solo los no evaluados (presente o descartado cuentan igual: hay fila)', () => {
      expect(antecedentesPersonalesPendientes(activos, [1, 3])).toEqual([{ id: 2, nombre: 'Cáncer' }]);
    });

    it('ninguno pendiente cuando todos tienen fila', () => {
      expect(antecedentesPersonalesPendientes(activos, [3, 2, 1])).toEqual([]);
    });

    it('no asume cantidad: con 17 y con 40 ítems activos funciona igual', () => {
      for (const n of [17, 40]) {
        const cat = Array.from({ length: n }, (_, i) => ({ id: i + 1, nombre: `Ítem ${i + 1}` }));
        expect(antecedentesPersonalesPendientes(cat, [])).toHaveLength(n);
        expect(antecedentesPersonalesPendientes(cat, cat.map((c) => c.id))).toHaveLength(0);
        expect(antecedentesPersonalesPendientes(cat, cat.slice(1).map((c) => c.id))).toEqual([cat[0]]);
      }
    });

    it('catálogo sin ítems activos → nada que exigir', () => {
      expect(antecedentesPersonalesPendientes([], [])).toEqual([]);
    });

    it('una fila de un ítem que ya no está activo no estorba', () => {
      expect(antecedentesPersonalesPendientes(activos, [99, 1, 2, 3])).toEqual([]);
    });
  });
});
