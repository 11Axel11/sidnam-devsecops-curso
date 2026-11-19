import { erroresDeEvento, TipoEventoResuelto } from './evento-importante.reglas';

const AHORA = new Date('2026-10-21T20:30:00.000Z');
const caida: TipoEventoResuelto = { id: 1, nombre: 'Caída', activo: true };
const otro: TipoEventoResuelto = { id: 6, nombre: 'Otro', activo: true };
const ayer = new Date('2026-10-20T15:00:00.000Z');

describe('erroresDeEvento (RF-TF-07)', () => {
  it('evento válido: sin errores (la descripción es opcional salvo en «Otro»)', () => {
    expect(erroresDeEvento({ fechaHora: ayer, tipoEventoId: 1, tipo: caida, descripcion: null }, AHORA)).toEqual([]);
    expect(erroresDeEvento({ fechaHora: ayer, tipoEventoId: 1, tipo: caida, descripcion: 'Cayó en el baño' }, AHORA)).toEqual([]);
  });

  it('«Otro» exige descripción (null, vacía o en blanco ⇒ error); con texto es válido', () => {
    const esperado = ['descripcion es obligatoria cuando el tipo es "Otro"'];
    for (const d of [null, undefined, '', '   ']) {
      expect(erroresDeEvento({ fechaHora: ayer, tipoEventoId: 6, tipo: otro, descripcion: d }, AHORA)).toEqual(esperado);
    }
    expect(erroresDeEvento({ fechaHora: ayer, tipoEventoId: 6, tipo: otro, descripcion: 'Mareo' }, AHORA)).toEqual([]);
  });

  it('«Otro» se identifica sin importar mayúsculas ni espacios', () => {
    const e = erroresDeEvento({ fechaHora: ayer, tipoEventoId: 6, tipo: { ...otro, nombre: ' OTRO ' }, descripcion: null }, AHORA);
    expect(e).toHaveLength(1);
  });

  it('tipo inexistente ⇒ error', () => {
    expect(erroresDeEvento({ fechaHora: ayer, tipoEventoId: 99, tipo: null, descripcion: null }, AHORA)).toEqual([
      'tipoEventoId 99 no existe en el catálogo',
    ]);
  });

  it('tipo desactivado ⇒ error (no se evalúa la descripción)', () => {
    const e = erroresDeEvento({ fechaHora: ayer, tipoEventoId: 6, tipo: { ...otro, activo: false }, descripcion: null }, AHORA);
    expect(e).toEqual(['tipoEventoId 6 ("Otro") está desactivado']);
  });

  it('fecha-hora futura (más allá de la tolerancia) o no interpretable ⇒ error', () => {
    const futura = new Date('2026-10-21T21:00:00.000Z');
    expect(erroresDeEvento({ fechaHora: futura, tipoEventoId: 1, tipo: caida, descripcion: null }, AHORA)).toEqual([
      'La fecha y hora del evento no puede ser posterior a la fecha y hora actual',
    ]);
    expect(erroresDeEvento({ fechaHora: null, tipoEventoId: 1, tipo: caida, descripcion: null }, AHORA)[0]).toMatch(
      /no es válida \(formato ISO 8601/,
    );
  });

  it('junta TODOS los problemas en un solo arreglo', () => {
    const e = erroresDeEvento({ fechaHora: null, tipoEventoId: 99, tipo: null, descripcion: null }, AHORA);
    expect(e).toHaveLength(2);
  });
});
