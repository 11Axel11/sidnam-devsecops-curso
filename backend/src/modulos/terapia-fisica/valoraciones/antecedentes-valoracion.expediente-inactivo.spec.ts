/* eslint-disable @typescript-eslint/no-unsafe-argument -- base simulada en memoria */
import { EstadoExpediente } from 'src/common/enums/estadosExpedientes.enum';
import { EstadoValoracion } from 'src/common/enums/estadoValoracion.enum';
import { AntecedentePersonal, TipoAntecedenteTraumatico } from 'src/modulos/catalogos/entities/catalogos.entities';
import { AntecedenteTraumatico } from '../entities/antecedente-traumatico.entity';
import { ValoracionFisioterapeutica } from '../entities/valoracion-fisioterapeutica.entity';
import { ValoracionTfAntecedentePersonal } from '../entities/valoracion-tf-antecedente-personal.entity';
import { AntecedentesValoracionService } from './antecedentes-valoracion.service';
import { crearDbSimulada } from './testing/db-simulada';
import { esperarExpedienteInactivo } from './testing/expediente-inactivo.util';

/**
 * Expediente INACTIVO (decisión de la Jefatura, octubre 2026): los antecedentes personales (upsert) y traumáticos (crear
 * y editar) cuelgan de la valoración y no se escriben (409 `EXPEDIENTE_INACTIVO`); retirar (anular) un traumático sigue
 * permitido para corregir errores.
 */
const escenario = () => {
  const db = crearDbSimulada([1]);
  db.insertar(AntecedentePersonal, { id: 1, nombre: 'Hipertensión', activo: true });
  db.insertar(TipoAntecedenteTraumatico, { id: 1, nombre: 'Fractura', activo: true });
  db.insertar(ValoracionFisioterapeutica, { id: 10, expedienteId: 1, estado: EstadoValoracion.BORRADOR, anulado: false });
  return { db, svc: new AntecedentesValoracionService(db.dataSource) };
};
const cerrar = (db: ReturnType<typeof crearDbSimulada>) => db.cambiarEstadoExpediente(1, EstadoExpediente.Inactivo);

describe('Antecedentes de la valoración fisioterapéutica — expediente inactivo', () => {
  it('registrar antecedentes personales (upsert) ⇒ 409 y no se guarda ninguno', async () => {
    const { db, svc } = escenario();
    cerrar(db);
    await esperarExpedienteInactivo(svc.registrarPersonales(10, { antecedentes: [{ antecedenteId: 1, presente: true }] }, 5), 1);
    expect(db.filas(ValoracionTfAntecedentePersonal)).toHaveLength(0);
  });

  it('crear un antecedente traumático ⇒ 409 y no se guarda', async () => {
    const { db, svc } = escenario();
    cerrar(db);
    await esperarExpedienteInactivo(svc.crearTraumatico(10, { tipoId: 1 }, 5), 1);
    expect(db.filas(AntecedenteTraumatico)).toHaveLength(0);
  });

  it('editar un antecedente traumático ⇒ 409 y queda intacto', async () => {
    const { db, svc } = escenario();
    const t = await svc.crearTraumatico(10, { tipoId: 1, localizacionAnatomica: 'Cadera' }, 5);
    cerrar(db);
    await esperarExpedienteInactivo(svc.actualizarTraumatico(t.id, { localizacionAnatomica: 'Rodilla' }, 5), 1);
    expect((db.filas(AntecedenteTraumatico)[0] as AntecedenteTraumatico).localizacionAnatomica).toBe('Cadera');
  });

  it('ANULAR un antecedente traumático sigue permitido (con motivo)', async () => {
    const { db, svc } = escenario();
    const t = await svc.crearTraumatico(10, { tipoId: 1 }, 5);
    cerrar(db);
    await expect(svc.anularTraumatico(t.id, 'Registrado por error', 6)).resolves.toMatchObject({ anulado: true, motivoAnulacion: 'Registrado por error' });
  });

  it('reactivar el expediente vuelve a permitir escribir antecedentes', async () => {
    const { db, svc } = escenario();
    cerrar(db);
    await esperarExpedienteInactivo(svc.crearTraumatico(10, { tipoId: 1 }, 5), 1);
    db.cambiarEstadoExpediente(1, EstadoExpediente.Activo);
    await expect(svc.crearTraumatico(10, { tipoId: 1 }, 5)).resolves.toBeDefined();
    await expect(svc.registrarPersonales(10, { antecedentes: [{ antecedenteId: 1, presente: false }] }, 5)).resolves.toHaveLength(1);
  });
});
