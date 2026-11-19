/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await -- base simulada en memoria */
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { EstadoValoracion } from 'src/common/enums/estadoValoracion.enum';
import { crearDbSimulada } from 'src/modulos/terapia-fisica/valoraciones/testing/db-simulada';
import { confirmarValoracion, MENSAJE_FALTANTES_CONFIRMAR } from './confirmacion.helper';

/**
 * Pruebas del helper COMÚN de confirmación (TF y Nutrición lo usan). Se prueba con una entidad
 * ficticia: lo que importa es la mecánica (candados, desplazar la vigente, rollback), no el dominio.
 */
class ValoracionFicticia {}

const ETIQUETA = 'Valoración ficticia';

const escenario = (expedientes: number[] = [1, 2]) => {
  const db = crearDbSimulada(expedientes);
  let seq = 100;
  const valoracion = (parcial: object = {}) =>
    db.insertar(ValoracionFicticia, {
      id: ++seq,
      expedienteId: 1,
      estado: EstadoValoracion.BORRADOR,
      anulado: false,
      ...parcial,
    });
  const confirmar = (id: number, validar = async () => ({ faltantes: [] as string[] }), usuarioId = 9) =>
    confirmarValoracion(db.dataSource, { entidad: ValoracionFicticia, id, usuarioId, etiqueta: ETIQUETA, validar });
  return { db, valoracion, confirmar };
};

describe('confirmarValoracion (helper común de la máquina de estados RN-03)', () => {
  it('borrador → vigente, sellando modificadoPorId', async () => {
    const { valoracion, confirmar } = escenario();
    const v = valoracion();
    const r: any = await confirmar(v.id);
    expect(r).toMatchObject({ id: v.id, estado: EstadoValoracion.VIGENTE, modificadoPorId: 9 });
  });

  it('usa una transacción READ COMMITTED', async () => {
    const { db, valoracion, confirmar } = escenario();
    const tx = jest.fn(db.dataSource.transaction);
    db.dataSource.transaction = tx;
    await confirmar(valoracion().id);
    expect(tx).toHaveBeenCalledTimes(1);
    expect(tx.mock.calls[0][0]).toBe('READ COMMITTED');
  });

  it('la vigente anterior del MISMO expediente pasa a reemplazada (con usuario y fecha de Node)', async () => {
    const { valoracion, confirmar } = escenario();
    const vieja: any = valoracion({ estado: EstadoValoracion.VIGENTE });
    const nueva = valoracion();
    await confirmar(nueva.id, undefined, 7);
    expect(vieja).toMatchObject({ estado: EstadoValoracion.REEMPLAZADA, modificadoPorId: 7 });
    expect(vieja.fechaModificacion).toBeInstanceOf(Date);
  });

  it('INVARIANTE: tras varias confirmaciones sucesivas hay una sola vigente no anulada', async () => {
    const { db, valoracion, confirmar } = escenario();
    const ids = [valoracion().id, valoracion().id, valoracion().id];
    for (const id of ids) {
      await confirmar(id);
      expect(db.filas(ValoracionFicticia).filter((f) => f.estado === 'vigente' && !f.anulado)).toHaveLength(1);
    }
    expect(db.filas(ValoracionFicticia).map((f) => f.estado)).toEqual(['reemplazada', 'reemplazada', 'vigente']);
  });

  it('no toca la vigente de OTRO expediente, ni las anuladas, ni las ya reemplazadas', async () => {
    const { valoracion, confirmar } = escenario();
    const otro = valoracion({ expedienteId: 2, estado: EstadoValoracion.VIGENTE });
    const anulada = valoracion({ estado: EstadoValoracion.VIGENTE, anulado: true });
    const reemplazada = valoracion({ estado: EstadoValoracion.REEMPLAZADA });
    await confirmar(valoracion().id);
    expect(otro.estado).toBe(EstadoValoracion.VIGENTE);
    expect(anulada.estado).toBe(EstadoValoracion.VIGENTE);
    expect(reemplazada.estado).toBe(EstadoValoracion.REEMPLAZADA);
  });

  it('orden de candados: expediente → valoración → update de la anterior', async () => {
    const { db, valoracion, confirmar } = escenario();
    valoracion({ estado: EstadoValoracion.VIGENTE });
    const nueva = valoracion();
    await confirmar(nueva.id);
    const iExp = db.log.indexOf('lock-expediente:1');
    const iVal = db.log.indexOf(`lock:ValoracionFicticia:${nueva.id}`);
    const iUpd = db.log.findIndex((e) => e.startsWith('update:'));
    expect(iExp).toBeGreaterThanOrEqual(0);
    expect(iExp).toBeLessThan(iVal);
    expect(iVal).toBeLessThan(iUpd);
  });

  describe('validar', () => {
    it('se ejecuta con ambos candados YA tomados y recibe (manager, valoración)', async () => {
      const { db, valoracion, confirmar } = escenario();
      const v = valoracion();
      const validar = jest.fn(async (_m: unknown, fila: { id: number }) => {
        expect(db.log).toContain('lock-expediente:1');
        expect(db.log).toContain(`lock:ValoracionFicticia:${fila.id}`);
        return { faltantes: [] as string[] };
      });
      await confirmar(v.id, validar as never);
      expect(validar).toHaveBeenCalledTimes(1);
      expect(validar.mock.calls[0][1]).toMatchObject({ id: v.id });
    });

    it('faltantes → 400 con el mensaje común, la lista y los extras; NO cambia nada (rollback)', async () => {
      const { db, valoracion, confirmar } = escenario();
      const vieja: any = valoracion({ estado: EstadoValoracion.VIGENTE });
      const nueva: any = valoracion();
      let error: any;
      try {
        await confirmar(nueva.id, async () => ({ faltantes: ['zona', 'antecedentePersonal:3'], extras: { pendientes: [{ id: 3 }] } }));
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.getResponse()).toEqual({
        message: MENSAJE_FALTANTES_CONFIRMAR,
        faltantes: ['zona', 'antecedentePersonal:3'],
        pendientes: [{ id: 3 }],
      });
      expect(nueva.estado).toBe(EstadoValoracion.BORRADOR);
      expect(vieja.estado).toBe(EstadoValoracion.VIGENTE);
      expect(db.log.some((e) => e.startsWith('update:'))).toBe(false);
    });

    it('sin faltantes los extras se ignoran y la confirmación procede', async () => {
      const { valoracion, confirmar } = escenario();
      const v = valoracion();
      await expect(confirmar(v.id, async () => ({ faltantes: [], extras: { x: 1 } }))).resolves.toMatchObject({
        estado: EstadoValoracion.VIGENTE,
      });
    });
  });

  describe('errores previos a validar (validar NO se llama)', () => {
    it('id inexistente → 404 con la etiqueta', async () => {
      const { confirmar } = escenario();
      const validar = jest.fn(async () => ({ faltantes: [] as string[] }));
      await expect(confirmar(999, validar)).rejects.toThrow(`${ETIQUETA} 999 no existe`);
      await expect(confirmar(999, validar)).rejects.toBeInstanceOf(NotFoundException);
      expect(validar).not.toHaveBeenCalled();
    });

    it.each([EstadoValoracion.VIGENTE, EstadoValoracion.REEMPLAZADA])('valoración %s → 409', async (estado) => {
      const { valoracion, confirmar } = escenario();
      const validar = jest.fn(async () => ({ faltantes: [] as string[] }));
      await expect(confirmar(valoracion({ estado }).id, validar)).rejects.toBeInstanceOf(ConflictException);
      expect(validar).not.toHaveBeenCalled();
    });

    it('valoración anulada → 409', async () => {
      const { valoracion, confirmar } = escenario();
      await expect(confirmar(valoracion({ anulado: true }).id)).rejects.toBeInstanceOf(ConflictException);
    });

    it('expediente inexistente → 404 (una valoración huérfana no se confirma)', async () => {
      const { valoracion, confirmar } = escenario([1]);
      await expect(confirmar(valoracion({ expedienteId: 77 }).id)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
