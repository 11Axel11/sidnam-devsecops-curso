import { ConflictException } from '@nestjs/common';
import { CODIGO_EXPEDIENTE_INACTIVO } from 'src/common/valoraciones/valoracion-lock.helper';

/**
 * Apoyo de las pruebas de «expediente inactivo» (decisión de la Jefatura, octubre 2026): comprueba el `409` con su
 * cuerpo estable `{ statusCode, error, codigo: 'EXPEDIENTE_INACTIVO', message, expedienteId }`.
 */
export async function esperarExpedienteInactivo(promesa: Promise<unknown>, expedienteId: number): Promise<void> {
  const e = await promesa.then(
    () => {
      throw new Error('se esperaba un 409 EXPEDIENTE_INACTIVO y la operación se completó');
    },
    (x: unknown) => x,
  );
  expect(e).toBeInstanceOf(ConflictException);
  const cuerpo = (e as ConflictException).getResponse() as Record<string, unknown>;
  expect(cuerpo).toMatchObject({ statusCode: 409, error: 'Conflict', codigo: CODIGO_EXPEDIENTE_INACTIVO, expedienteId });
  expect(cuerpo.message).toEqual(expect.stringContaining(`El expediente ${expedienteId} está inactivo`));
}
