/* eslint-disable @typescript-eslint/no-unsafe-argument -- base simulada en memoria */
import { EstadoExpediente } from 'src/common/enums/estadosExpedientes.enum';
import { crearDbSimulada } from 'src/modulos/terapia-fisica/valoraciones/testing/db-simulada';
import { esperarExpedienteInactivo } from 'src/modulos/terapia-fisica/valoraciones/testing/expediente-inactivo.util';
import { ControlNutricional } from '../entities/control-nutricional.entity';
import { ControlesNutricionalesService } from './controles-nutricionales.service';

/** Expediente INACTIVO (decisión de la Jefatura, octubre 2026): no se registran controles nuevos; la serie (RF-NU-02) se consulta y se puede anular. */
const escenario = () => {
  const db = crearDbSimulada([1]);
  return { db, svc: new ControlesNutricionalesService(db.dataSource) };
};
const datos = { peso: 58.4, talla: 152 };
const cerrar = (db: ReturnType<typeof crearDbSimulada>) => db.cambiarEstadoExpediente(1, EstadoExpediente.Inactivo);

describe('Control nutricional — expediente inactivo', () => {
  it('crear ⇒ 409 EXPEDIENTE_INACTIVO y no se guarda nada', async () => {
    const { db, svc } = escenario();
    cerrar(db);
    await esperarExpedienteInactivo(svc.crear(1, datos, 5), 1);
    expect(db.filas(ControlNutricional)).toHaveLength(0);
  });

  it('la serie sigue disponible (con variaciones) y ANULAR sigue permitido', async () => {
    const { db, svc } = escenario();
    const c = await svc.crear(1, datos, 5);
    cerrar(db);
    const serie = await svc.listar(1, {});
    expect(serie).toHaveLength(1);
    expect(serie[0]).toMatchObject({ imc: 25.3 });
    await expect(svc.anular(c.id, 'Peso mal digitado', 6)).resolves.toMatchObject({ anulado: true, imc: 25.3 });
  });

  it('reactivar el expediente vuelve a permitir registrar', async () => {
    const { db, svc } = escenario();
    cerrar(db);
    await esperarExpedienteInactivo(svc.crear(1, datos, 5), 1);
    db.cambiarEstadoExpediente(1, EstadoExpediente.Activo);
    await expect(svc.crear(1, datos, 5)).resolves.toMatchObject({ imc: 25.3 });
  });
});
