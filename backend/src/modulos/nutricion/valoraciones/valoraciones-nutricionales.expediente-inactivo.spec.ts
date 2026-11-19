/* eslint-disable @typescript-eslint/no-unsafe-argument -- base simulada en memoria */
import { NotFoundException } from '@nestjs/common';
import { EstadoExpediente } from 'src/common/enums/estadosExpedientes.enum';
import { EstadoValoracion } from 'src/common/enums/estadoValoracion.enum';
import { DatoFuncionalNutricion } from 'src/modulos/catalogos/entities/catalogos.entities';
import { crearDbSimulada } from 'src/modulos/terapia-fisica/valoraciones/testing/db-simulada';
import { esperarExpedienteInactivo } from 'src/modulos/terapia-fisica/valoraciones/testing/expediente-inactivo.util';
import { ValoracionNutricional } from '../entities/valoracion-nutricional.entity';
import { ValoracionesNutricionalesService } from './valoraciones-nutricionales.service';

/**
 * Expediente INACTIVO (decisión de la Jefatura, octubre 2026): la valoración nutricional no admite crear, editar un
 * borrador ni confirmar (409 `EXPEDIENTE_INACTIVO`); sí anular y consultar.
 */
const escenario = () => {
  const db = crearDbSimulada([1, 2]);
  db.insertar(DatoFuncionalNutricion, { id: 2, nombre: 'Deambula con ayuda', activo: true });
  return { db, svc: new ValoracionesNutricionalesService(db.dataSource) };
};
const filas = (db: ReturnType<typeof crearDbSimulada>) => db.filas(ValoracionNutricional) as ValoracionNutricional[];
const cerrar = (db: ReturnType<typeof crearDbSimulada>, id = 1) => db.cambiarEstadoExpediente(id, EstadoExpediente.Inactivo);

describe('Valoración nutricional — expediente inactivo', () => {
  it('crear ⇒ 409 EXPEDIENTE_INACTIVO y no se guarda nada', async () => {
    const { db, svc } = escenario();
    cerrar(db);
    await esperarExpedienteInactivo(svc.crear(1, { datoFuncionalId: 2 }, 5), 1);
    expect(filas(db)).toHaveLength(0);
  });

  it('editar un borrador ⇒ 409 y el borrador queda intacto', async () => {
    const { db, svc } = escenario();
    const v = await svc.crear(1, { problemaVisual: false, datoFuncionalId: 2 }, 5);
    cerrar(db);
    await esperarExpedienteInactivo(svc.actualizar(v.id, { problemaVisual: true }, 5), 1);
    expect(filas(db)[0].problemaVisual).toBe(false);
  });

  it('confirmar ⇒ 409; sigue en borrador', async () => {
    const { db, svc } = escenario();
    const v = await svc.crear(1, { datoFuncionalId: 2 }, 5);
    cerrar(db);
    await esperarExpedienteInactivo(svc.confirmar(v.id, 5), 1);
    expect(filas(db)[0].estado).toBe(EstadoValoracion.BORRADOR);
  });

  it('ANULAR sigue permitido; los GET (historial, vigente, detalle) siguen disponibles', async () => {
    const { db, svc } = escenario();
    const a = await svc.crear(1, { datoFuncionalId: 2 }, 5);
    await svc.confirmar(a.id, 5);
    const b = await svc.crear(1, { datoFuncionalId: 2 }, 5);
    cerrar(db);
    expect(await svc.listar(1)).toHaveLength(2);
    expect(await svc.obtenerVigente(1)).toMatchObject({ id: a.id });
    expect(await svc.obtenerDetalle(a.id)).toMatchObject({ id: a.id });
    await expect(svc.anular(b.id, 'Error', 6)).resolves.toMatchObject({ anulado: true, motivoAnulacion: 'Error' });
  });

  it('reactivar el expediente vuelve a permitir escribir', async () => {
    const { db, svc } = escenario();
    const v = await svc.crear(1, { datoFuncionalId: 2 }, 5);
    cerrar(db);
    await esperarExpedienteInactivo(svc.actualizar(v.id, { ansiedad: true }, 5), 1);
    db.cambiarEstadoExpediente(1, EstadoExpediente.Activo);
    await expect(svc.actualizar(v.id, { ansiedad: true }, 5)).resolves.toMatchObject({ ansiedad: true });
    await expect(svc.confirmar(v.id, 5)).resolves.toMatchObject({ estado: EstadoValoracion.VIGENTE });
  });

  it('expediente inexistente ⇒ 404 (no 409)', async () => {
    const { svc } = escenario();
    await expect(svc.crear(99, {}, 5)).rejects.toBeInstanceOf(NotFoundException);
  });
});
