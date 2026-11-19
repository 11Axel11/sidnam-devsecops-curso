/* eslint-disable @typescript-eslint/no-unsafe-argument -- base simulada en memoria */
import { NotFoundException } from '@nestjs/common';
import { EstadoExpediente } from 'src/common/enums/estadosExpedientes.enum';
import { TipoEventoImportante } from 'src/modulos/catalogos/entities/catalogos.entities';
import { EventoImportanteTf } from '../entities/evento-importante-tf.entity';
import { crearDbSimulada } from '../valoraciones/testing/db-simulada';
import { esperarExpedienteInactivo } from '../valoraciones/testing/expediente-inactivo.util';
import { EventosImportantesService } from './eventos-importantes.service';

/** Expediente INACTIVO (decisión de la Jefatura, octubre 2026): no se registran eventos nuevos; se pueden consultar y anular. */
const escenario = () => {
  const db = crearDbSimulada([1, 2]);
  db.insertar(TipoEventoImportante, { id: 1, nombre: 'Caída', activo: true });
  return { db, svc: new EventosImportantesService(db.dataSource) };
};
const cerrar = (db: ReturnType<typeof crearDbSimulada>) => db.cambiarEstadoExpediente(1, EstadoExpediente.Inactivo);

describe('Eventos importantes — expediente inactivo', () => {
  it('crear ⇒ 409 EXPEDIENTE_INACTIVO y no se guarda nada', async () => {
    const { db, svc } = escenario();
    cerrar(db);
    await esperarExpedienteInactivo(svc.crear(1, { tipoEventoId: 1 }, 5), 1);
    expect(db.filas(EventoImportanteTf)).toHaveLength(0);
  });

  it('el listado sigue disponible y ANULAR sigue permitido', async () => {
    const { db, svc } = escenario();
    const e = await svc.crear(1, { tipoEventoId: 1 }, 5);
    cerrar(db);
    expect(await svc.listar(1, {})).toHaveLength(1);
    await expect(svc.anular(e.id, 'Evento duplicado', 6)).resolves.toMatchObject({ anulado: true, motivoAnulacion: 'Evento duplicado' });
    expect(await svc.listar(1, { incluirAnulados: true })).toHaveLength(1);
  });

  it('reactivar el expediente vuelve a permitir registrar; otro expediente activo no se ve afectado; inexistente ⇒ 404', async () => {
    const { db, svc } = escenario();
    cerrar(db);
    await expect(svc.crear(2, { tipoEventoId: 1 }, 5)).resolves.toBeDefined();
    await expect(svc.crear(99, { tipoEventoId: 1 }, 5)).rejects.toBeInstanceOf(NotFoundException);
    db.cambiarEstadoExpediente(1, EstadoExpediente.Activo);
    await expect(svc.crear(1, { tipoEventoId: 1 }, 5)).resolves.toBeDefined();
  });
});
