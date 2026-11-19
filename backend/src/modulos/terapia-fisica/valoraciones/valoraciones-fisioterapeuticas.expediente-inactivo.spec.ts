/* eslint-disable @typescript-eslint/no-unsafe-argument -- base simulada en memoria */
import { EstadoExpediente } from 'src/common/enums/estadosExpedientes.enum';
import { EstadoValoracion } from 'src/common/enums/estadoValoracion.enum';
import { NotFoundException } from '@nestjs/common';
import { ValoracionFisioterapeutica } from '../entities/valoracion-fisioterapeutica.entity';
import { crearDbSimulada } from './testing/db-simulada';
import { esperarExpedienteInactivo } from './testing/expediente-inactivo.util';
import { ValoracionesFisioterapeuticasService } from './valoraciones-fisioterapeuticas.service';

/**
 * Expediente INACTIVO (decisión de la Jefatura, octubre 2026): la valoración fisioterapéutica no admite crear, editar
 * un borrador ni confirmar (409 `EXPEDIENTE_INACTIVO`); sí anular y consultar (historial, vigente, detalle).
 */
const escenario = () => {
  const db = crearDbSimulada([1, 2]);
  return { db, svc: new ValoracionesFisioterapeuticasService(db.dataSource) };
};
const filas = (db: ReturnType<typeof crearDbSimulada>) => db.filas(ValoracionFisioterapeutica) as ValoracionFisioterapeutica[];
const cerrar = (db: ReturnType<typeof crearDbSimulada>, id = 1) => db.cambiarEstadoExpediente(id, EstadoExpediente.Inactivo);

describe('Valoración fisioterapéutica — expediente inactivo', () => {
  it('crear ⇒ 409 EXPEDIENTE_INACTIVO y no se guarda nada', async () => {
    const { db, svc } = escenario();
    cerrar(db);
    await esperarExpedienteInactivo(svc.crear(1, {}, 5), 1);
    expect(filas(db)).toHaveLength(0);
  });

  it('editar un borrador (PATCH) ⇒ 409 y el borrador queda intacto', async () => {
    const { db, svc } = escenario();
    const v = await svc.crear(1, { tratamiento: 'Original' }, 5);
    cerrar(db);
    await esperarExpedienteInactivo(svc.actualizar(v.id, { tratamiento: 'Cambiado' }, 5), 1);
    expect(filas(db)[0].tratamiento).toBe('Original');
  });

  it('confirmar ⇒ 409; el borrador sigue en borrador y la vigente anterior no se desplaza', async () => {
    const { db, svc } = escenario();
    const vigente = await svc.crear(1, {}, 5);
    await svc.confirmar(vigente.id, 5);
    const borrador = await svc.crear(1, {}, 5);
    cerrar(db);
    await esperarExpedienteInactivo(svc.confirmar(borrador.id, 5), 1);
    expect(filas(db).find((f) => f.id === borrador.id)?.estado).toBe(EstadoValoracion.BORRADOR);
    expect(filas(db).find((f) => f.id === vigente.id)?.estado).toBe(EstadoValoracion.VIGENTE);
  });

  it('ANULAR sigue permitido (corregir errores), también la vigente; deja motivo y usuario', async () => {
    const { db, svc } = escenario();
    const v = await svc.crear(1, {}, 5);
    const w = await svc.crear(1, {}, 5);
    await svc.confirmar(w.id, 5);
    cerrar(db);
    await expect(svc.anular(v.id, 'Error de registro', 6)).resolves.toMatchObject({ anulado: true, motivoAnulacion: 'Error de registro', anuladoPorId: 6 });
    await expect(svc.anular(w.id, 'Era otro residente', 6)).resolves.toMatchObject({ anulado: true });
  });

  it('los GET siguen disponibles: historial, vigente y detalle', async () => {
    const { db, svc } = escenario();
    const v = await svc.crear(1, { tratamiento: 'Mejora' }, 5);
    await svc.confirmar(v.id, 5);
    cerrar(db);
    expect(await svc.listar(1)).toHaveLength(1);
    expect(await svc.obtenerVigente(1)).toMatchObject({ id: v.id });
    expect(await svc.obtenerDetalle(v.id)).toMatchObject({ id: v.id, tratamiento: 'Mejora' });
  });

  it('reactivar el expediente vuelve a permitir crear, editar y confirmar', async () => {
    const { db, svc } = escenario();
    const v = await svc.crear(1, {}, 5);
    cerrar(db);
    await esperarExpedienteInactivo(svc.confirmar(v.id, 5), 1);
    db.cambiarEstadoExpediente(1, EstadoExpediente.Activo);
    await expect(svc.actualizar(v.id, { tratamiento: 'Ya activo' }, 5)).resolves.toMatchObject({ tratamiento: 'Ya activo' });
    await expect(svc.confirmar(v.id, 5)).resolves.toMatchObject({ estado: EstadoValoracion.VIGENTE });
    await expect(svc.crear(1, {}, 5)).resolves.toBeDefined();
  });

  it('el bloqueo es por expediente: el otro expediente (activo) sigue escribiendo; uno inexistente ⇒ 404 (no 409)', async () => {
    const { db, svc } = escenario();
    cerrar(db, 1);
    await expect(svc.crear(2, {}, 5)).resolves.toBeDefined();
    await expect(svc.crear(99, {}, 5)).rejects.toBeInstanceOf(NotFoundException);
  });
});
