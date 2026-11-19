import { CaracteristicaDolor } from '../enums/caracteristicaDolor.enum';
import {
  camposFaltantesParaConfirmar,
  errorDeFecha,
  esFechaValida,
  validarCoherencia,
} from './valoracion-fisioterapeutica.reglas';

describe('valoración fisioterapéutica — reglas puras', () => {
  describe('fecha', () => {
    it.each([['2026-09-15', true], ['2026-02-29', false], ['2028-02-29', true], ['2026-13-01', false], ['15/09/2026', false], ['', false]])(
      'esFechaValida(%s) = %s',
      (f, ok) => expect(esFechaValida(f)).toBe(ok),
    );

    it('no puede ser posterior a hoy; hoy y el pasado sí', () => {
      expect(errorDeFecha('2026-10-14', '2026-10-14')).toBeNull();
      expect(errorDeFecha('2026-10-13', '2026-10-14')).toBeNull();
      expect(errorDeFecha('2026-10-15', '2026-10-14')).toMatch(/posterior a hoy/);
      expect(errorDeFecha('2026-02-30', '2026-10-14')).toMatch(/no es una fecha válida/);
    });
  });

  describe('validarCoherencia (se aplica también a borradores)', () => {
    it('un borrador vacío o con los valores por defecto es coherente', () => {
      expect(validarCoherencia({})).toEqual([]);
      expect(validarCoherencia({ presentaDolor: false, antecedentesCaidas: false, usoAyudasBiomecanicas: false })).toEqual([]);
    });

    it('CA-04: punzante + irradiado hacia el miembro inferior derecho, intensidad 7 → coherente', () => {
      expect(
        validarCoherencia({
          presentaDolor: true,
          zonaDolorosa: 'Miembro inferior derecho',
          caracteristicasDolor: [CaracteristicaDolor.PUNZANTE, CaracteristicaDolor.IRRADIADO],
          direccionIrradiacion: 'Hacia el miembro inferior derecho',
          intensidadDolor: 7,
        }),
      ).toEqual([]);
    });

    it('intensidad / zona / características sin dolor → error', () => {
      const e = validarCoherencia({
        presentaDolor: false,
        intensidadDolor: 5,
        zonaDolorosa: 'Rodilla',
        caracteristicasDolor: [CaracteristicaDolor.PUNZANTE],
      });
      expect(e).toHaveLength(3);
    });

    it('dirección de irradiación solo con «irradiado»', () => {
      expect(
        validarCoherencia({ presentaDolor: true, caracteristicasDolor: [CaracteristicaDolor.PUNZANTE], direccionIrradiacion: 'Brazo' }),
      ).toEqual([expect.stringMatching(/irradiado/)]);
    });

    it('detalle de caídas / ayudas solo si el booleano correspondiente es true', () => {
      expect(validarCoherencia({ antecedentesCaidas: false, detalleCaidas: 'x' })).toHaveLength(1);
      expect(validarCoherencia({ usoAyudasBiomecanicas: false, detalleAyudasBiomecanicas: 'x' })).toHaveLength(1);
      expect(validarCoherencia({ antecedentesCaidas: true, detalleCaidas: 'x' })).toEqual([]);
    });

    it('un detalle en blanco no cuenta como contradicción', () => {
      expect(validarCoherencia({ antecedentesCaidas: false, detalleCaidas: '   ' })).toEqual([]);
    });
  });

  describe('camposFaltantesParaConfirmar (solo coherencia, decisión 14/10/2026)', () => {
    const base = { fecha: '2026-10-14' };

    it('con solo la fecha, se puede confirmar (no se inventa obligatoriedad clínica)', () => {
      expect(camposFaltantesParaConfirmar(base)).toEqual([]);
    });

    it('sin fecha falta la fecha', () => {
      expect(camposFaltantesParaConfirmar({})).toEqual(['fecha']);
    });

    it('con dolor: exige zona e intensidad', () => {
      expect(camposFaltantesParaConfirmar({ ...base, presentaDolor: true })).toEqual(['zonaDolorosa', 'intensidadDolor']);
      expect(camposFaltantesParaConfirmar({ ...base, presentaDolor: true, zonaDolorosa: 'Rodilla', intensidadDolor: 3 })).toEqual([]);
    });

    it('con caídas / ayudas: exige el detalle', () => {
      expect(camposFaltantesParaConfirmar({ ...base, antecedentesCaidas: true, usoAyudasBiomecanicas: true })).toEqual([
        'detalleCaidas',
        'detalleAyudasBiomecanicas',
      ]);
    });

    it('«irradiado» exige dirección', () => {
      expect(
        camposFaltantesParaConfirmar({ ...base, presentaDolor: true, zonaDolorosa: 'x', intensidadDolor: 1, caracteristicasDolor: [CaracteristicaDolor.IRRADIADO] }),
      ).toEqual(['direccionIrradiacion']);
    });

    it('texto solo con espacios cuenta como faltante', () => {
      expect(camposFaltantesParaConfirmar({ ...base, antecedentesCaidas: true, detalleCaidas: '   ' })).toEqual(['detalleCaidas']);
    });
  });
});
