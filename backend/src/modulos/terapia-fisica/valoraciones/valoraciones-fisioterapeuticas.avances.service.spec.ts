/* eslint-disable @typescript-eslint/no-unsafe-argument -- base simulada en memoria */
import { BadRequestException } from '@nestjs/common';
import { EstadoValoracion } from 'src/common/enums/estadoValoracion.enum';
import { crearDbSimulada } from './testing/db-simulada';
import { ValoracionesFisioterapeuticasService } from './valoraciones-fisioterapeuticas.service';

/**
 * `avances` (RF-TF-12): opcional, viaja en POST, PATCH y en las lecturas (`vigente`, detalle, historial) con el mismo
 * camino de `diagnosticoDiferencial` y `tratamiento`; NO se exige para confirmar.
 */
const escenario = () => {
  const db = crearDbSimulada([1]);
  return { db, svc: new ValoracionesFisioterapeuticasService(db.dataSource) };
};
const LARGO = 'Evolución favorable, mayor tolerancia a la marcha asistida y menos dolor al levantarse ñ. '.repeat(40);

describe('ValoracionesFisioterapeuticasService — avances', () => {
  it('POST sin avances: queda sin valor (el campo es opcional)', async () => {
    const { svc } = escenario();
    const v = await svc.crear(1, {}, 5);
    expect(v.avances ?? null).toBeNull();
  });

  it('POST con avances: se guarda y se devuelve junto a diagnosticoDiferencial y tratamiento', async () => {
    const { svc } = escenario();
    const v = await svc.crear(1, { diagnosticoDiferencial: 'Gonartrosis', tratamiento: 'Fortalecimiento', avances: 'Camina 20 metros sin apoyo' }, 5);
    expect(v).toMatchObject({ diagnosticoDiferencial: 'Gonartrosis', tratamiento: 'Fortalecimiento', avances: 'Camina 20 metros sin apoyo' });
  });

  it('un texto de más de 2000 caracteres se conserva íntegro (POST y PATCH)', async () => {
    const { svc } = escenario();
    expect(LARGO.length).toBeGreaterThan(2000);
    const v = await svc.crear(1, { avances: LARGO }, 5);
    expect(v.avances).toBe(LARGO);
    const larguisimo = LARGO + LARGO;
    const p = await svc.actualizar(v.id, { avances: larguisimo }, 5);
    expect(p.avances).toBe(larguisimo);
  });

  it('PATCH cambia el texto y null lo limpia; omitirlo no lo toca', async () => {
    const { svc } = escenario();
    const v = await svc.crear(1, { avances: 'Primer avance' }, 5);
    await expect(svc.actualizar(v.id, { avances: 'Segundo avance' }, 5)).resolves.toMatchObject({ avances: 'Segundo avance' });
    await expect(svc.actualizar(v.id, { tratamiento: 'Otro' }, 5)).resolves.toMatchObject({ avances: 'Segundo avance', tratamiento: 'Otro' });
    await expect(svc.actualizar(v.id, { avances: null }, 5)).resolves.toMatchObject({ avances: null });
  });

  it('NO se exige para confirmar: un borrador sin avances se confirma', async () => {
    const { svc } = escenario();
    const v = await svc.crear(1, { fecha: '2026-10-01' }, 5);
    await expect(svc.confirmar(v.id, 5)).resolves.toMatchObject({ estado: EstadoValoracion.VIGENTE });
  });

  it('un borrador con avances se confirma y avances viaja en vigente, detalle e historial', async () => {
    const { svc } = escenario();
    const v = await svc.crear(1, { avances: 'Mejora la fuerza de cuádriceps' }, 5);
    await svc.confirmar(v.id, 5);
    expect((await svc.obtenerVigente(1)).avances).toBe('Mejora la fuerza de cuádriceps');
    expect((await svc.obtenerDetalle(v.id)).avances).toBe('Mejora la fuerza de cuádriceps');
    expect((await svc.listar(1))[0].avances).toBe('Mejora la fuerza de cuádriceps');
  });

  it('un PATCH con avances en una valoración ya vigente sigue rechazándose (solo se edita el borrador)', async () => {
    const { svc } = escenario();
    const v = await svc.crear(1, {}, 5);
    await svc.confirmar(v.id, 5);
    await expect(svc.actualizar(v.id, { avances: 'tarde' }, 5)).rejects.not.toBeInstanceOf(BadRequestException);
    await expect(svc.actualizar(v.id, { avances: 'tarde' }, 5)).rejects.toThrow();
  });
});
