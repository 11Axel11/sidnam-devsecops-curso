/* eslint-disable @typescript-eslint/no-unsafe-argument -- base simulada en memoria */
import { EstadoExpediente } from 'src/common/enums/estadosExpedientes.enum';
import { EjercicioTestMovimiento } from 'src/modulos/catalogos/entities/catalogos.entities';
import { AplicacionTestMovimiento } from '../entities/aplicacion-test-movimiento.entity';
import { crearDbSimulada } from '../valoraciones/testing/db-simulada';
import { esperarExpedienteInactivo } from '../valoraciones/testing/expediente-inactivo.util';
import { AplicacionesTestMovimientoService } from './aplicaciones-test-movimiento.service';

/** Expediente INACTIVO (decisión de la Jefatura, octubre 2026): no se registran aplicaciones nuevas; se pueden consultar y anular. */
const escenario = () => {
  const db = crearDbSimulada([1]);
  db.insertar(EjercicioTestMovimiento, { id: 1, nombre: 'Transferencias', activo: true });
  db.insertar(EjercicioTestMovimiento, { id: 2, nombre: 'Flexiones de hombro', activo: true });
  return { db, svc: new AplicacionesTestMovimientoService(db.dataSource) };
};
const cuerpo = { ejercicios: [1, 2].map((ejercicioId) => ({ ejercicioId, modalidad: 'Con apoyo', resultado: 'Lo realiza' })) };
const cerrar = (db: ReturnType<typeof crearDbSimulada>) => db.cambiarEstadoExpediente(1, EstadoExpediente.Inactivo);

describe('Test de movimiento — expediente inactivo', () => {
  it('crear ⇒ 409 EXPEDIENTE_INACTIVO y no se guarda ni la cabecera ni el detalle', async () => {
    const { db, svc } = escenario();
    cerrar(db);
    await esperarExpedienteInactivo(svc.crear(1, cuerpo, 5), 1);
    expect(db.filas(AplicacionTestMovimiento)).toHaveLength(0);
  });

  it('el listado sigue disponible y ANULAR sigue permitido', async () => {
    const { db, svc } = escenario();
    const a = await svc.crear(1, cuerpo, 5);
    cerrar(db);
    expect(await svc.listar(1, {})).toHaveLength(1);
    await expect(svc.anular(a.id, 'Se aplicó al residente equivocado', 6)).resolves.toMatchObject({ anulado: true });
  });

  it('reactivar el expediente vuelve a permitir registrar', async () => {
    const { db, svc } = escenario();
    cerrar(db);
    await esperarExpedienteInactivo(svc.crear(1, cuerpo, 5), 1);
    db.cambiarEstadoExpediente(1, EstadoExpediente.Activo);
    await expect(svc.crear(1, cuerpo, 5)).resolves.toBeDefined();
  });
});
