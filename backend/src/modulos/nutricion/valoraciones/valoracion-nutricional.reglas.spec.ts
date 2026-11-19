import { EstadoCognitivo } from '../enums/estado-cognitivo.enum';
import { camposFaltantesParaConfirmar, validarCoherencia } from './valoracion-nutricional.reglas';

describe('valoración nutricional — reglas puras', () => {
  describe('validarCoherencia (se aplica también a borradores)', () => {
    it('un borrador vacío o con los valores por defecto es coherente', () => {
      expect(validarCoherencia({})).toEqual([]);
      expect(validarCoherencia({ alergiaMedicamentos: false, estadoCognitivo: EstadoCognitivo.NORMAL })).toEqual([]);
    });

    it('CA-17: alergia a penicilina + deterioro leve → coherente', () => {
      expect(
        validarCoherencia({
          alergiaMedicamentos: true,
          detalleAlergiaMedicamentos: 'Penicilina',
          estadoCognitivo: EstadoCognitivo.CON_DETERIORO,
          nivelDeterioroCognitivo: 'leve',
        }),
      ).toEqual([]);
    });

    it('detalle de alergia sin alergia → error con el texto exacto', () => {
      expect(validarCoherencia({ alergiaMedicamentos: false, detalleAlergiaMedicamentos: 'Penicilina' })).toEqual([
        'detalleAlergiaMedicamentos solo aplica si alergiaMedicamentos es true',
      ]);
      expect(validarCoherencia({ detalleAlergiaMedicamentos: 'Penicilina' })).toHaveLength(1); // alergia no informada = false
    });

    it('nivel de deterioro con estado normal → error con el texto exacto', () => {
      expect(validarCoherencia({ estadoCognitivo: EstadoCognitivo.NORMAL, nivelDeterioroCognitivo: 'leve' })).toEqual([
        'nivelDeterioroCognitivo solo aplica si estadoCognitivo es con_deterioro',
      ]);
    });

    it('nivel sin estado cognitivo informado se trata como «normal» (default de la columna)', () => {
      expect(validarCoherencia({ nivelDeterioroCognitivo: 'leve' })).toHaveLength(1);
    });

    it('ambas contradicciones a la vez → dos errores', () => {
      expect(validarCoherencia({ detalleAlergiaMedicamentos: 'x', nivelDeterioroCognitivo: 'severo' })).toHaveLength(2);
    });

    it('un detalle/nivel en blanco no cuenta como contradicción', () => {
      expect(validarCoherencia({ detalleAlergiaMedicamentos: '   ' })).toEqual([]);
      expect(validarCoherencia({ detalleAlergiaMedicamentos: null, nivelDeterioroCognitivo: null })).toEqual([]);
    });
  });

  describe('camposFaltantesParaConfirmar (decisión del 21/10/2026)', () => {
    const completa = { fecha: '2026-10-21', datoFuncionalId: 2 };

    it('fecha + dato funcional bastan (sin alergia y con estado normal)', () => {
      expect(camposFaltantesParaConfirmar(completa)).toEqual([]);
    });

    it('sin nada: falta fecha y dato funcional, en ese orden', () => {
      expect(camposFaltantesParaConfirmar({})).toEqual(['fecha', 'datoFuncionalId']);
    });

    it('datoFuncionalId null o undefined cuenta como faltante; 0 no existe como id válido pero no es «falta» aquí', () => {
      expect(camposFaltantesParaConfirmar({ fecha: '2026-10-21', datoFuncionalId: null })).toEqual(['datoFuncionalId']);
      expect(camposFaltantesParaConfirmar({ fecha: '2026-10-21' })).toEqual(['datoFuncionalId']);
    });

    it('con alergia: exige el detalle (en blanco cuenta como faltante)', () => {
      expect(camposFaltantesParaConfirmar({ ...completa, alergiaMedicamentos: true })).toEqual(['detalleAlergiaMedicamentos']);
      expect(camposFaltantesParaConfirmar({ ...completa, alergiaMedicamentos: true, detalleAlergiaMedicamentos: '  ' })).toEqual([
        'detalleAlergiaMedicamentos',
      ]);
      expect(camposFaltantesParaConfirmar({ ...completa, alergiaMedicamentos: true, detalleAlergiaMedicamentos: 'Penicilina' })).toEqual([]);
    });

    it('con deterioro: exige el nivel', () => {
      expect(camposFaltantesParaConfirmar({ ...completa, estadoCognitivo: EstadoCognitivo.CON_DETERIORO })).toEqual([
        'nivelDeterioroCognitivo',
      ]);
      expect(
        camposFaltantesParaConfirmar({ ...completa, estadoCognitivo: EstadoCognitivo.CON_DETERIORO, nivelDeterioroCognitivo: 'leve' }),
      ).toEqual([]);
    });

    it('todos juntos, en el orden fijo: fecha, datoFuncionalId, detalleAlergiaMedicamentos, nivelDeterioroCognitivo', () => {
      expect(
        camposFaltantesParaConfirmar({ alergiaMedicamentos: true, estadoCognitivo: EstadoCognitivo.CON_DETERIORO }),
      ).toEqual(['fecha', 'datoFuncionalId', 'detalleAlergiaMedicamentos', 'nivelDeterioroCognitivo']);
    });

    it('los demás datos (problemas visual/oral, depresión, ansiedad) NO son obligatorios', () => {
      expect(camposFaltantesParaConfirmar({ ...completa })).toEqual([]);
    });
  });
});
