/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/require-await, @typescript-eslint/no-unsafe-return -- mocks de repositorios/guards */
import { CatalogosSeedService } from './catalogos-seed.service';
import {
  ANTECEDENTES_PERSONALES,
  DATOS_FUNCIONALES_NUTRICION,
  EJERCICIOS_TEST_MOVIMIENTO,
  TIPOS_ANTECEDENTE_TRAUMATICO,
  TIPOS_EVENTO_IMPORTANTE,
} from './catalogos-iniciales';

const buildRepo = (existentes = 0) => {
  const repo: any = {
    metadata: { tableName: 'tabla' },
    filas: Array.from({ length: existentes }, (_, i) => ({ id: i + 1 })),
    count: jest.fn(async () => repo.filas.length),
    create: jest.fn((d: any) => ({ ...d })),
    save: jest.fn(async (filas: any[]) => { repo.filas.push(...filas); return filas; }),
  };
  return repo;
};

describe('CatalogosSeedService', () => {
  const crear = (repos: any[]) => new CatalogosSeedService(...(repos as [any, any, any, any, any]));

  it('siembra cada catálogo vacío con sus ítems iniciales, activos y sin usuario creador', async () => {
    const repos = [buildRepo(), buildRepo(), buildRepo(), buildRepo(), buildRepo()];
    await crear(repos).onModuleInit();
    const [df, ap, ta, te, ej] = repos;
    expect(df.filas.map((f: any) => f.nombre)).toEqual(DATOS_FUNCIONALES_NUTRICION);
    expect(ap.filas.map((f: any) => f.nombre)).toEqual(ANTECEDENTES_PERSONALES);
    expect(ta.filas.map((f: any) => f.nombre)).toEqual(TIPOS_ANTECEDENTE_TRAUMATICO);
    expect(te.filas.map((f: any) => f.nombre)).toEqual(TIPOS_EVENTO_IMPORTANTE);
    expect(ej.filas.map((f: any) => f.nombre)).toEqual(EJERCICIOS_TEST_MOVIMIENTO);
    for (const r of repos) {
      expect(r.filas.every((f: any) => f.activo === true && f.creadoPorId === undefined)).toBe(true);
    }
  });

  it('idempotente: un segundo arranque no duplica nada', async () => {
    const repos = [buildRepo(), buildRepo(), buildRepo(), buildRepo(), buildRepo()];
    const svc = crear(repos);
    await svc.onModuleInit();
    const tamanos = repos.map((r) => r.filas.length);
    await svc.onModuleInit();
    expect(repos.map((r) => r.filas.length)).toEqual(tamanos);
  });

  it('respeta la administración: si la tabla ya tiene contenido no inserta nada (no repone ítems desactivados)', async () => {
    const repo = buildRepo(3);
    expect(await crear([repo, repo, repo, repo, repo]).sembrar(repo, ['A', 'B'])).toBe(0);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('el contenido inicial coincide con el documento de requerimientos', () => {
    expect(EJERCICIOS_TEST_MOVIMIENTO).toHaveLength(3); // Anexo C.2
    expect(TIPOS_ANTECEDENTE_TRAUMATICO).toContain('Otro'); // RF-TF-03: «otro» exige descripción
    expect(TIPOS_EVENTO_IMPORTANTE).toEqual(
      expect.arrayContaining(['Caída', 'Cambio de medicación', 'Crisis médica', 'Hospitalización', 'Infección', 'Otro']),
    );
    expect(DATOS_FUNCIONALES_NUTRICION).toHaveLength(6); // RF-NU-04
    // sin nombres repetidos (la columna es unique)
    for (const l of [ANTECEDENTES_PERSONALES, TIPOS_ANTECEDENTE_TRAUMATICO, TIPOS_EVENTO_IMPORTANTE, DATOS_FUNCIONALES_NUTRICION, EJERCICIOS_TEST_MOVIMIENTO]) {
      expect(new Set(l.map((n) => n.toLowerCase())).size).toBe(l.length);
    }
  });
});
