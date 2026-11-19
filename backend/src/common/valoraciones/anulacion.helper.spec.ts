/* eslint-disable @typescript-eslint/no-unsafe-argument -- base simulada en memoria */
import { ConflictException, NotFoundException } from '@nestjs/common';
import { crearDbSimulada } from 'src/modulos/terapia-fisica/valoraciones/testing/db-simulada';
import { Anulable } from './anulable.entity';
import { anularRegistro, anularRegistroPorId } from './anulacion.helper';

/** Entidad ficticia: lo que importa es la mecánica de anulación, no el dominio. */
class RegistroFicticio {}

const nuevo = (): Anulable =>
  ({ anulado: false, motivoAnulacion: null, anuladoPorId: null, fechaAnulacion: null }) as unknown as Anulable;

describe('anularRegistro', () => {
  it('deja anulado con motivo, usuario, fecha y auditoría de modificación', () => {
    const r = anularRegistro(nuevo(), 'Cargado en el expediente equivocado', 9, 'ya anulado');
    expect(r.anulado).toBe(true);
    expect(r.motivoAnulacion).toBe('Cargado en el expediente equivocado');
    expect(r.anuladoPorId).toBe(9);
    expect(r.modificadoPorId).toBe(9);
    expect(r.fechaAnulacion).toBeInstanceOf(Date);
  });

  it('anular dos veces ⇒ 409 con el mensaje dado y sin pisar el motivo original', () => {
    const r = anularRegistro(nuevo(), 'primero', 9, 'ya anulado');
    expect(() => anularRegistro(r, 'segundo', 10, 'El registro ya está anulado')).toThrow(ConflictException);
    expect(() => anularRegistro(r, 'segundo', 10, 'El registro ya está anulado')).toThrow('El registro ya está anulado');
    expect(r.motivoAnulacion).toBe('primero');
    expect(r.anuladoPorId).toBe(9);
  });
});

describe('anularRegistroPorId', () => {
  const escenario = () => {
    const db = crearDbSimulada();
    const fila = db.insertar(RegistroFicticio, { id: 5, anulado: false });
    const anular = (id = 5, motivo = 'Error de digitación', usuarioId = 9) =>
      anularRegistroPorId(db.dataSource, {
        entidad: RegistroFicticio,
        id,
        motivo,
        usuarioId,
        etiqueta: 'Registro ficticio',
        mensajeYaAnulado: 'El registro ya está anulado',
      });
    return { db, fila, anular };
  };

  it('anula y guarda, tomando antes el candado de la fila (FOR UPDATE)', async () => {
    const { db, fila, anular } = escenario();
    const r = await anular();
    expect(r.anulado).toBe(true);
    expect(fila).toMatchObject({ anulado: true, motivoAnulacion: 'Error de digitación', anuladoPorId: 9, modificadoPorId: 9 });
    expect(db.log).toContain('lock:RegistroFicticio:5');
  });

  it('registro inexistente ⇒ 404 con la etiqueta', async () => {
    const { anular } = escenario();
    await expect(anular(99)).rejects.toThrow(NotFoundException);
    await expect(anular(99)).rejects.toThrow('Registro ficticio 99 no existe');
  });

  it('ya anulado ⇒ 409 y la anulación original queda intacta', async () => {
    const { fila, anular } = escenario();
    await anular(5, 'primero', 9);
    await expect(anular(5, 'segundo', 10)).rejects.toThrow(ConflictException);
    expect(fila).toMatchObject({ motivoAnulacion: 'primero', anuladoPorId: 9 });
  });
});
