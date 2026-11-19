/* eslint-disable @typescript-eslint/no-unsafe-argument -- base simulada en memoria */
import { EstadoExpediente } from 'src/common/enums/estadosExpedientes.enum';
import { EvaluacionBarthel } from '../entities/evaluacion-barthel.entity';
import { crearDbSimulada } from '../valoraciones/testing/db-simulada';
import { esperarExpedienteInactivo } from '../valoraciones/testing/expediente-inactivo.util';
import { EvaluacionesBarthelService } from './evaluaciones-barthel.service';

/** Expediente INACTIVO (decisión de la Jefatura, octubre 2026): no se registran evaluaciones de Barthel nuevas; se pueden consultar y anular. */
const MAXIMO = { comer: 10, lavarse: 5, vestirse: 10, arreglarse: 5, deposiciones: 10, miccion: 10, usarRetrete: 10, trasladarse: 15, deambular: 15, escalones: 10 };
const escenario = () => {
  const db = crearDbSimulada([1]);
  return { db, svc: new EvaluacionesBarthelService(db.dataSource) };
};
const cerrar = (db: ReturnType<typeof crearDbSimulada>) => db.cambiarEstadoExpediente(1, EstadoExpediente.Inactivo);

describe('Índice de Barthel — expediente inactivo', () => {
  it('crear ⇒ 409 EXPEDIENTE_INACTIVO y no se guarda nada', async () => {
    const { db, svc } = escenario();
    cerrar(db);
    await esperarExpedienteInactivo(svc.crear(1, MAXIMO, 5), 1);
    expect(db.filas(EvaluacionBarthel)).toHaveLength(0);
  });

  it('el listado sigue disponible y ANULAR sigue permitido (la evaluación conserva su total y grado)', async () => {
    const { db, svc } = escenario();
    const e = await svc.crear(1, MAXIMO, 5);
    cerrar(db);
    expect(await svc.listar(1, {})).toHaveLength(1);
    await expect(svc.anular(e.id, 'Registrada por error', 6)).resolves.toMatchObject({ anulado: true, puntajeTotal: 100 });
  });

  it('reactivar el expediente vuelve a permitir registrar', async () => {
    const { db, svc } = escenario();
    cerrar(db);
    await esperarExpedienteInactivo(svc.crear(1, MAXIMO, 5), 1);
    db.cambiarEstadoExpediente(1, EstadoExpediente.Activo);
    await expect(svc.crear(1, MAXIMO, 5)).resolves.toMatchObject({ puntajeTotal: 100 });
  });
});
