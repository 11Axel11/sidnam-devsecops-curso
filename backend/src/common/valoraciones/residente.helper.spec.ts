/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument -- base simulada en memoria */
import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  crearDbSimulada,
  NACIMIENTO_SIMULADO_POR_DEFECTO,
} from 'src/modulos/terapia-fisica/valoraciones/testing/db-simulada';
import { obtenerNacimientoDelResidente } from './residente.helper';

describe('obtenerNacimientoDelResidente', () => {
  const db = crearDbSimulada([1, 2, 3], {
    2: new Date('1935-11-27T00:00:00.000Z'), // como la lee el driver: guardada 1935-11-26 18:00 con -06:00
    3: null, // expediente sin residente
  });
  const m = db.dataSource.manager;

  it('devuelve la fecha de nacimiento del residente como YYYY-MM-DD', async () => {
    await expect(obtenerNacimientoDelResidente(m, 1)).resolves.toBe('1940-05-12');
    expect(NACIMIENTO_SIMULADO_POR_DEFECTO.toISOString().slice(0, 10)).toBe('1940-05-12');
  });

  it('usa componentes UTC: la fecha guardada como «día anterior 18:00» (-06:00) vuelve al día digitado', async () => {
    await expect(obtenerNacimientoDelResidente(m, 2)).resolves.toBe('1935-11-27');
  });

  it('expediente inexistente ⇒ 404 (RN-01: nunca se crea implícitamente)', async () => {
    await expect(obtenerNacimientoDelResidente(m, 99)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('expediente sin residente ⇒ 409 (no se inventa la edad)', async () => {
    await expect(obtenerNacimientoDelResidente(m, 3)).rejects.toBeInstanceOf(ConflictException);
    await expect(obtenerNacimientoDelResidente(m, 3)).rejects.toThrow(/no tiene la fecha de nacimiento/);
  });
});
