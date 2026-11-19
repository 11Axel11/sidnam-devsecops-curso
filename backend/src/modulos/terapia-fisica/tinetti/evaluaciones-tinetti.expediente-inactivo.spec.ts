/* eslint-disable @typescript-eslint/no-unsafe-argument -- base simulada en memoria */
import { EstadoExpediente } from 'src/common/enums/estadosExpedientes.enum';
import { maximoDeItem } from 'src/common/valoraciones/instrumento';
import { EvaluacionTinetti } from '../entities/evaluacion-tinetti.entity';
import { crearDbSimulada } from '../valoraciones/testing/db-simulada';
import { esperarExpedienteInactivo } from '../valoraciones/testing/expediente-inactivo.util';
import { EvaluacionesTinettiService } from './evaluaciones-tinetti.service';
import { ITEMS_TINETTI_V1, ItemsTinetti } from './tinetti-v1.instrumento';

/**
 * Expediente INACTIVO (decisión de la Jefatura, octubre 2026): no se registran evaluaciones de Tinetti nuevas; se pueden
 * consultar y anular. El 409 se lanza ANTES de consumir un número de control.
 */
const MAXIMO = Object.fromEntries(ITEMS_TINETTI_V1.map((i) => [i.campo, maximoDeItem(i)])) as ItemsTinetti;
const escenario = () => {
  const db = crearDbSimulada([1]);
  return { db, svc: new EvaluacionesTinettiService(db.dataSource) };
};
const cerrar = (db: ReturnType<typeof crearDbSimulada>) => db.cambiarEstadoExpediente(1, EstadoExpediente.Inactivo);

describe('Escala de Tinetti — expediente inactivo', () => {
  it('crear ⇒ 409 EXPEDIENTE_INACTIVO y no se guarda nada (con el candado del expediente ya tomado)', async () => {
    const { db, svc } = escenario();
    cerrar(db);
    await esperarExpedienteInactivo(svc.crear(1, { ...MAXIMO }, 5), 1);
    expect(db.filas(EvaluacionTinetti)).toHaveLength(0);
    expect(db.log).toContain('lock-expediente:1');
  });

  it('NO se consume número de control: al reactivar, la primera evaluación recibe el nº 1', async () => {
    const { db, svc } = escenario();
    cerrar(db);
    await esperarExpedienteInactivo(svc.crear(1, { ...MAXIMO }, 5), 1);
    await esperarExpedienteInactivo(svc.crear(1, { ...MAXIMO }, 5), 1);
    db.cambiarEstadoExpediente(1, EstadoExpediente.Activo);
    await expect(svc.crear(1, { ...MAXIMO }, 5)).resolves.toMatchObject({ numeroControl: 1 });
    await expect(svc.crear(1, { ...MAXIMO }, 5)).resolves.toMatchObject({ numeroControl: 2 });
  });

  it('el listado sigue disponible y ANULAR sigue permitido', async () => {
    const { db, svc } = escenario();
    const e = await svc.crear(1, { ...MAXIMO }, 5);
    cerrar(db);
    expect(await svc.listar(1, {})).toHaveLength(1);
    await expect(svc.anular(e.id, 'Registrada por error', 6)).resolves.toMatchObject({ anulado: true, numeroControl: 1 });
  });
});
