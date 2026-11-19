/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument -- base simulada en memoria */
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EstadoExpediente } from 'src/common/enums/estadosExpedientes.enum';
import { EstadoValoracion } from 'src/common/enums/estadoValoracion.enum';
import { crearDbSimulada } from 'src/modulos/terapia-fisica/valoraciones/testing/db-simulada';
import { esperarExpedienteInactivo } from 'src/modulos/terapia-fisica/valoraciones/testing/expediente-inactivo.util';
import { ValoracionFisioterapeutica } from 'src/modulos/terapia-fisica/entities/valoracion-fisioterapeutica.entity';
import {
  bloquearValoracionEscribible,
  CODIGO_EXPEDIENTE_INACTIVO,
  exigirExpediente,
  exigirExpedienteEscribible,
  ExpedienteInactivoException,
} from './valoracion-lock.helper';

/**
 * Un solo lugar decide si un expediente admite ESCRITURAS (decisión de la Jefatura, octubre 2026): `exigirExpediente`
 * queda para lecturas y vistas previas (404 si no existe) y `exigirExpedienteEscribible` agrega el 409
 * `EXPEDIENTE_INACTIVO`.
 */
const escenario = () => {
  const db = crearDbSimulada([1, 2], {}, [2]); // el 2 está inactivo
  return { db, m: db.dataSource.manager };
};

describe('ExpedienteInactivoException', () => {
  it('es un 409 con el cuerpo estable (codigo, expedienteId, message claro)', () => {
    const e = new ExpedienteInactivoException(7);
    expect(e).toBeInstanceOf(ConflictException);
    expect(e.getStatus()).toBe(409);
    expect(e.getResponse()).toEqual({
      statusCode: 409,
      error: 'Conflict',
      codigo: 'EXPEDIENTE_INACTIVO',
      message:
        'El expediente 7 está inactivo: no se pueden registrar ni modificar datos clínicos (las consultas y las anulaciones siguen disponibles). Reactive el expediente para continuar.',
      expedienteId: 7,
    });
    expect(CODIGO_EXPEDIENTE_INACTIVO).toBe('EXPEDIENTE_INACTIVO');
  });
});

describe('exigirExpediente (lecturas y vistas previas): no mira el estado', () => {
  it('un expediente activo y uno INACTIVO pasan; uno inexistente ⇒ 404', async () => {
    const { m } = escenario();
    await expect(exigirExpediente(m, 1)).resolves.toBeUndefined();
    await expect(exigirExpediente(m, 2)).resolves.toBeUndefined();
    await expect(exigirExpediente(m, 99)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('exigirExpedienteEscribible (escrituras)', () => {
  it('activo ⇒ pasa', async () => {
    const { m } = escenario();
    await expect(exigirExpedienteEscribible(m, 1)).resolves.toBeUndefined();
  });

  it('inactivo ⇒ 409 con codigo EXPEDIENTE_INACTIVO y el id', async () => {
    const { m } = escenario();
    await esperarExpedienteInactivo(exigirExpedienteEscribible(m, 2), 2);
  });

  it('inexistente ⇒ 404 (no 409), también con bloqueo', async () => {
    const { m } = escenario();
    await expect(exigirExpedienteEscribible(m, 99)).rejects.toBeInstanceOf(NotFoundException);
    await expect(exigirExpedienteEscribible(m, 99, true)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('con bloqueo toma el candado FOR UPDATE del expediente y aun así rechaza el inactivo', async () => {
    const { db, m } = escenario();
    await exigirExpedienteEscribible(m, 1, true);
    expect(db.log).toContain('lock-expediente:1');
    await esperarExpedienteInactivo(exigirExpedienteEscribible(m, 2, true), 2);
  });

  it('sin bloqueo NO toma ningún candado (orden expediente → valoración intacto)', async () => {
    const { db, m } = escenario();
    await exigirExpedienteEscribible(m, 1);
    await esperarExpedienteInactivo(exigirExpedienteEscribible(m, 2), 2);
    expect(db.log.filter((l) => l.startsWith('lock'))).toEqual([]);
  });

  it('reactivar el expediente vuelve a permitir escribir; cerrarlo lo impide', async () => {
    const { db, m } = escenario();
    db.cambiarEstadoExpediente(2, EstadoExpediente.Activo);
    await expect(exigirExpedienteEscribible(m, 2)).resolves.toBeUndefined();
    db.cambiarEstadoExpediente(1, EstadoExpediente.Inactivo);
    await esperarExpedienteInactivo(exigirExpedienteEscribible(m, 1), 1);
  });
});

describe('bloquearValoracionEscribible', () => {
  const valoracion = (db: ReturnType<typeof crearDbSimulada>, expedienteId: number) =>
    db.insertar(ValoracionFisioterapeutica, { id: 10 + expedienteId, expedienteId, estado: EstadoValoracion.BORRADOR, anulado: false });

  it('valoración de un expediente activo ⇒ la devuelve (con su candado)', async () => {
    const { db, m } = escenario();
    valoracion(db, 1);
    const v = await bloquearValoracionEscribible(m, ValoracionFisioterapeutica, 11, 'Valoración');
    expect(v.id).toBe(11);
    expect(db.log).toContain('lock:ValoracionFisioterapeutica:11');
  });

  it('valoración de un expediente INACTIVO ⇒ 409 EXPEDIENTE_INACTIVO', async () => {
    const { db, m } = escenario();
    valoracion(db, 2);
    await esperarExpedienteInactivo(bloquearValoracionEscribible(m, ValoracionFisioterapeutica, 12, 'Valoración'), 2);
  });

  it('valoración inexistente ⇒ 404 (antes que cualquier 409)', async () => {
    const { m } = escenario();
    await expect(bloquearValoracionEscribible(m, ValoracionFisioterapeutica, 999, 'Valoración')).rejects.toBeInstanceOf(NotFoundException);
  });
});
