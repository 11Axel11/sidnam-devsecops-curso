/* eslint-disable @typescript-eslint/no-unsafe-argument -- base simulada en memoria */
import { NotFoundException } from '@nestjs/common';
import { EstadoExpediente } from 'src/common/enums/estadosExpedientes.enum';
import { crearDbSimulada } from 'src/modulos/terapia-fisica/valoraciones/testing/db-simulada';
import { esperarExpedienteInactivo } from 'src/modulos/terapia-fisica/valoraciones/testing/expediente-inactivo.util';
import { EvaluacionMna } from '../entities/evaluacion-mna.entity';
import { CrearEvaluacionMnaDto } from './dto/evaluacion-mna.dto';
import { EvaluacionesMnaService } from './evaluaciones-mna.service';

/**
 * Expediente INACTIVO (decisión de la Jefatura, octubre 2026): el REGISTRO del MNA responde 409 `EXPEDIENTE_INACTIVO`;
 * la VISTA PREVIA (`calcular`, no persiste nada) sigue permitida, igual que el listado y la anulación.
 */
const dto = (parcial: object): CrearEvaluacionMnaDto => parcial as CrearEvaluacionMnaDto;
const CUERPO = dto({ itemA: 2, itemB: 3, itemC: 2, itemD: 2, itemE: 2, itemF: 3 });
const escenario = () => {
  const db = crearDbSimulada([1]);
  return { db, svc: new EvaluacionesMnaService(db.dataSource) };
};
const cerrar = (db: ReturnType<typeof crearDbSimulada>) => db.cambiarEstadoExpediente(1, EstadoExpediente.Inactivo);

describe('MNA — expediente inactivo', () => {
  it('crear ⇒ 409 EXPEDIENTE_INACTIVO y no se guarda nada', async () => {
    const { db, svc } = escenario();
    cerrar(db);
    await esperarExpedienteInactivo(svc.crear(1, CUERPO, 5), 1);
    expect(db.filas(EvaluacionMna)).toHaveLength(0);
  });

  it('la VISTA PREVIA (calcular) sigue permitida en un expediente inactivo y no persiste nada ni toma candados', async () => {
    const { db, svc } = escenario();
    cerrar(db);
    await expect(svc.calcular(1, CUERPO)).resolves.toMatchObject({ subtotalCribaje: 14 });
    expect(db.filas(EvaluacionMna)).toHaveLength(0);
    expect(db.log.filter((l) => l.startsWith('lock'))).toEqual([]);
  });

  it('la vista previa de un expediente inexistente sigue siendo 404 (no 409)', async () => {
    const { svc } = escenario();
    await expect(svc.calcular(99, CUERPO)).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.crear(99, CUERPO, 5)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('el listado sigue disponible y ANULAR sigue permitido', async () => {
    const { db, svc } = escenario();
    const e = await svc.crear(1, CUERPO, 5);
    cerrar(db);
    expect(await svc.listar(1, {})).toHaveLength(1);
    await expect(svc.anular(e.id, 'Registrada por error', 6)).resolves.toMatchObject({ anulado: true, subtotalCribaje: 14 });
  });

  it('reactivar el expediente vuelve a permitir registrar', async () => {
    const { db, svc } = escenario();
    cerrar(db);
    await esperarExpedienteInactivo(svc.crear(1, CUERPO, 5), 1);
    db.cambiarEstadoExpediente(1, EstadoExpediente.Activo);
    await expect(svc.crear(1, CUERPO, 5)).resolves.toMatchObject({ subtotalCribaje: 14 });
  });
});
