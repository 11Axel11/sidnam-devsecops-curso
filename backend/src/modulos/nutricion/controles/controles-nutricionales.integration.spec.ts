/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment -- prueba contra MySQL real */
import 'reflect-metadata';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { generarTextoLargo } from 'src/common/testing/texto-largo.helper';
import { MAX_TEXTO_LIBRE } from 'src/common/validators/texto-libre.decorator';
import {
  abrirDataSourceDeIntegracion,
  INTEGRACION_ACTIVA,
  nuevoExpediente,
  nuevoExpedienteConResidente,
} from 'src/modulos/terapia-fisica/valoraciones/testing/integracion';
import { ControlNutricional } from '../entities/control-nutricional.entity';
import { ControlesNutricionalesService } from './controles-nutricionales.service';

/**
 * INTEGRACIÓN con MySQL REAL (opt-in; ver terapia-fisica/valoraciones/testing/integracion.ts) del control
 * nutricional: decimales exactos, IMC y edad persistidos, edad con la fecha de nacimiento guardada como la
 * guarda la app, texto largo, serie con variaciones, anulación (incluida la simultánea) y esquema.
 *
 *   RUN_DB_INTEGRATION=1 DB_TEST_NAME=sidnam_scratch_b4 npx jest integration --runInBand
 *
 * Las suites de integración comparten la base y hacen `synchronize`: correrlas EN SERIE (--runInBand).
 */
(INTEGRACION_ACTIVA ? describe : describe.skip)('Control nutricional — integración MySQL', () => {
  jest.setTimeout(240_000);
  let ds: DataSource;
  let svc: ControlesNutricionalesService;

  beforeAll(async () => {
    ds = await abrirDataSourceDeIntegracion();
    svc = new ControlesNutricionalesService(ds);
  });

  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  const nacido1940 = () => nuevoExpedienteConResidente(ds, new Date('1940-05-12')); // como llega del frontend: medianoche UTC
  const leer = (id: number) => ds.getRepository(ControlNutricional).findOneByOrFail({ id });
  const crudo = async (id: number): Promise<Record<string, string>> =>
    (
      await ds.query(
        'SELECT CAST(peso AS CHAR) AS peso, CAST(talla AS CHAR) AS talla, CAST(imc AS CHAR) AS imc, CAST(fuerzaMuscular AS CHAR) AS fm, CAST(fecha AS CHAR) AS fecha FROM control_nutricional WHERE id = ?',
        [id],
      )
    )[0];

  describe('CA-14: peso y talla ⇒ IMC y edad calculados y almacenados', () => {
    it('58,4 kg y 152 cm ⇒ IMC 25,3; edad del residente a esa fecha; decimales exactos y como number', async () => {
      const exp = await nacido1940();
      const c = await svc.crear(exp, { peso: 58.4, talla: 152, fecha: '2026-10-21', fuerzaMuscular: 18.5 }, 7);
      expect(c).toMatchObject({ imc: 25.3, edadMomentoControl: 86, anulado: false });

      const guardado = await leer(c.id);
      expect(guardado).toMatchObject({ peso: 58.4, talla: 152, imc: 25.3, fuerzaMuscular: 18.5, edadMomentoControl: 86 });
      expect(typeof guardado.peso).toBe('number'); // sin transformer MySQL devolvería '58.4'
      expect(typeof guardado.imc).toBe('number');
      expect(guardado.circunferenciaBraquial).toBeNull();
      expect(await crudo(c.id)).toEqual({ peso: '58.4', talla: '152.0', imc: '25.3', fm: '18.5', fecha: '2026-10-21' });
    });

    it('un segundo control tres meses después: ambos se conservan (RN-02)', async () => {
      const exp = await nacido1940();
      const a = await svc.crear(exp, { peso: 58.4, talla: 152, fecha: '2026-07-21' }, 7);
      const b = await svc.crear(exp, { peso: 57.9, talla: 152, fecha: '2026-10-21' }, 7);
      expect((await leer(a.id)).peso).toBe(58.4);
      expect((await leer(b.id)).imc).toBe(25.1);
      expect((await svc.listar(exp, {})).map((x) => x.id)).toEqual([b.id, a.id]);
    });

    it('el IMC y la edad guardados no cambian aunque después se lea la fila (nunca se recalculan)', async () => {
      const exp = await nacido1940();
      const c = await svc.crear(exp, { peso: 58.4, talla: 152, fecha: '2026-10-21' }, 7);
      await ds.query('UPDATE control_nutricional SET imc = 31.1, edadMomentoControl = 70 WHERE id = ?', [c.id]); // simula dato histórico
      const [fila] = await svc.listar(exp, {});
      expect(fila).toMatchObject({ imc: 31.1, edadMomentoControl: 70 });
    });
  });

  describe('edad con la fecha de nacimiento guardada COMO LA GUARDA LA APP', () => {
    it('medianoche UTC escrita por el driver (-06:00) como «día anterior 18:00» y leída de vuelta: cumpleaños en la frontera', async () => {
      const exp = await nuevoExpedienteConResidente(ds, new Date('1935-11-27')); // lo que genera el DTO con '1935-11-27'
      const [{ raw }] = await ds.query(
        `SELECT CAST(r.fecha_nacimiento AS CHAR) AS raw FROM residente r
           JOIN expediente_residente e ON e.residenteIdAdultoMayor = r.id_adulto_mayor WHERE e.id_expediente = ?`,
        [exp],
      );
      expect(raw).toBe('1935-11-26 18:00:00'); // evidencia del escenario (igual que la fila de dev)

      expect((await svc.crear(exp, { peso: 60, talla: 150, fecha: '2025-11-26' }, 7)).edadMomentoControl).toBe(89); // víspera
      expect((await svc.crear(exp, { peso: 60, talla: 150, fecha: '2025-11-27' }, 7)).edadMomentoControl).toBe(90); // el día
      expect((await svc.crear(exp, { peso: 60, talla: 150, fecha: '2025-11-28' }, 7)).edadMomentoControl).toBe(90);
    });

    it('un control antes del nacimiento se rechaza y no llega a la base', async () => {
      const exp = await nuevoExpedienteConResidente(ds, new Date('1935-11-27'));
      await expect(svc.crear(exp, { peso: 60, talla: 150, fecha: '1935-11-26' }, 7)).rejects.toBeInstanceOf(BadRequestException);
      expect(await ds.getRepository(ControlNutricional).count({ where: { expedienteId: exp } })).toBe(0);
    });
  });

  describe('validaciones que dependen de la base', () => {
    it('expediente inexistente ⇒ 404 (crear y listar)', async () => {
      await expect(svc.crear(999_999_999, { peso: 60, talla: 150 }, 7)).rejects.toBeInstanceOf(NotFoundException);
      await expect(svc.listar(999_999_999, {})).rejects.toBeInstanceOf(NotFoundException);
    });

    it('expediente SIN residente ⇒ 409: no se inventa la edad', async () => {
      const exp = await nuevoExpediente(ds);
      await expect(svc.crear(exp, { peso: 60, talla: 150 }, 7)).rejects.toBeInstanceOf(ConflictException);
      expect(await ds.getRepository(ControlNutricional).count({ where: { expedienteId: exp } })).toBe(0);
    });

    it('fecha futura ⇒ 400 y nada se guarda', async () => {
      const exp = await nacido1940();
      await expect(svc.crear(exp, { peso: 60, talla: 150, fecha: '2999-01-01' }, 7)).rejects.toBeInstanceOf(BadRequestException);
      expect(await ds.getRepository(ControlNutricional).count({ where: { expedienteId: exp } })).toBe(0);
    });

    it('sin fecha usa hoy (Costa Rica)', async () => {
      const exp = await nacido1940();
      const c = await svc.crear(exp, { peso: 60, talla: 150 }, 7);
      expect(c.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect((await crudo(c.id)).fecha).toBe(c.fecha);
    });
  });

  describe('texto largo (CA-06): sin fragmentar', () => {
    it('interpretación de 2500 y de 20 000 caracteres vuelve idéntica', async () => {
      const exp = await nacido1940();
      for (const n of [2500, MAX_TEXTO_LIBRE]) {
        const texto = generarTextoLargo(n);
        const c = await svc.crear(exp, { peso: 60, talla: 150, fecha: '2026-10-21', interpretacion: texto }, 7);
        expect((await leer(c.id)).interpretacion).toBe(texto);
      }
    });

    it('el motivo de anulación de 2000 caracteres vuelve idéntico', async () => {
      const exp = await nacido1940();
      const c = await svc.crear(exp, { peso: 60, talla: 150, fecha: '2026-10-21' }, 7);
      const motivo = generarTextoLargo(2000);
      await svc.anular(c.id, motivo, 8);
      expect((await leer(c.id)).motivoAnulacion).toBe(motivo);
    });
  });

  describe('serie histórica (RF-NU-02 / CA-15)', () => {
    it('seis controles: orden, variaciones, filtros y anulados', async () => {
      const exp = await nacido1940();
      const pesos = [60.1, 59.5, 58.4, 58.9, 57.2, 57.8];
      const ids: number[] = [];
      for (let i = 0; i < pesos.length; i++) {
        const mes = String(i + 1).padStart(2, '0');
        ids.push((await svc.crear(exp, { peso: pesos[i], talla: 152, fecha: `2026-${mes}-15` }, 7)).id);
      }

      const serie = await svc.listar(exp, {});
      expect(serie.map((c) => c.id)).toEqual([...ids].reverse());
      expect(serie.map((c) => c.variacionPeso)).toEqual([0.6, -1.7, 0.5, -1.1, -0.6, null]);
      expect(serie[0].variacionImc).toBe(0.2); // IMC 24,8 → 25,0 (57,2 → 57,8 kg a 152 cm)

      // rango: la primera fila del rango se compara con el control previo, fuera del rango
      const rango = await svc.listar(exp, { desde: '2026-04-15', hasta: '2026-05-15' });
      expect(rango.map((c) => c.id)).toEqual([ids[4], ids[3]]);
      expect(rango[1].variacionPeso).toBe(0.5);

      // un anulado sale de la serie por defecto, y el siguiente se compara con el último no anulado
      await svc.anular(ids[2], 'Error de digitación', 8);
      const sinAnulado = await svc.listar(exp, {});
      expect(sinAnulado.map((c) => c.id)).not.toContain(ids[2]);
      expect(sinAnulado.find((c) => c.id === ids[3])?.variacionPeso).toBe(-0.6); // 58,9 − 59,5
      const conAnulado = await svc.listar(exp, { incluirAnulados: true });
      expect(conAnulado).toHaveLength(6);
      expect(conAnulado.find((c) => c.id === ids[2])).toMatchObject({ anulado: true, variacionPeso: null });
    });

    it('mismo día: el último registrado primero', async () => {
      const exp = await nacido1940();
      const a = await svc.crear(exp, { peso: 60, talla: 150, fecha: '2026-10-21' }, 7);
      const b = await svc.crear(exp, { peso: 61, talla: 150, fecha: '2026-10-21' }, 7);
      expect((await svc.listar(exp, {})).map((c) => c.id)).toEqual([b.id, a.id]);
    });
  });

  describe('anulación (RN-02): nunca DELETE', () => {
    it('anula con motivo, usuario y fecha y deja la fila; segunda vez ⇒ 409', async () => {
      const exp = await nacido1940();
      const c = await svc.crear(exp, { peso: 60, talla: 150, fecha: '2026-10-21' }, 7);
      const r = await svc.anular(c.id, 'Residente equivocado', 8);
      expect(r).toMatchObject({ anulado: true, motivoAnulacion: 'Residente equivocado', anuladoPorId: 8, modificadoPorId: 8 });

      const fila = await leer(c.id);
      expect(fila).toMatchObject({ anulado: true, imc: 26.7, peso: 60, creadoPorId: 7 }); // lo clínico queda intacto
      expect(fila.fechaAnulacion).toBeInstanceOf(Date);
      expect(fila.fechaCreacion).toBeInstanceOf(Date);

      await expect(svc.anular(c.id, 'otra vez', 9)).rejects.toBeInstanceOf(ConflictException);
      expect((await leer(c.id)).motivoAnulacion).toBe('Residente equivocado');
    });

    it('control inexistente ⇒ 404', async () => {
      await expect(svc.anular(999_999_999, 'x', 8)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('dos anulaciones SIMULTÁNEAS del mismo control: una gana y la otra recibe 409 (candado FOR UPDATE)', async () => {
      for (let ronda = 0; ronda < 5; ronda++) {
        const exp = await nacido1940();
        const c = await svc.crear(exp, { peso: 60, talla: 150, fecha: '2026-10-21' }, 7);
        const r = await Promise.allSettled([svc.anular(c.id, 'motivo A', 8), svc.anular(c.id, 'motivo B', 9)]);
        expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
        const rechazo = r.find((x) => x.status === 'rejected') as PromiseRejectedResult;
        expect(rechazo.reason).toBeInstanceOf(ConflictException);
        const ganadora = r.findIndex((x) => x.status === 'fulfilled');
        expect((await leer(c.id)).motivoAnulacion).toBe(ganadora === 0 ? 'motivo A' : 'motivo B');
      }
    });
  });

  describe('esquema (synchronize)', () => {
    it('índice (expediente_id, fecha) y FK a expediente_residente', async () => {
      const indices: { Key_name: string; Column_name: string; Seq_in_index: number }[] = await ds.query(
        'SHOW INDEX FROM control_nutricional',
      );
      const columnas = indices
        .filter((i) => i.Key_name === 'idx_control_nutricional_expediente_fecha')
        .sort((a, b) => a.Seq_in_index - b.Seq_in_index)
        .map((i) => i.Column_name);
      expect(columnas).toEqual(['expediente_id', 'fecha']);

      const fks: { t: string }[] = await ds.query(
        `SELECT REFERENCED_TABLE_NAME AS t FROM information_schema.KEY_COLUMN_USAGE
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'control_nutricional' AND REFERENCED_TABLE_NAME IS NOT NULL`,
      );
      expect(fks.map((f) => f.t)).toEqual(['expediente_residente']);
    });

    it('las columnas decimales y la edad tienen el tipo esperado', async () => {
      const cols: { Field: string; Type: string; Null: string }[] = await ds.query('SHOW COLUMNS FROM control_nutricional');
      const tipo = (c: string) => cols.find((x) => x.Field === c);
      for (const c of ['peso', 'talla', 'imc', 'circunferenciaBraquial', 'circunferenciaPantorrilla', 'alturaRodilla', 'fuerzaMuscular']) {
        expect(tipo(c)?.Type).toBe('decimal(5,1)');
      }
      expect(tipo('peso')?.Null).toBe('NO');
      expect(tipo('fuerzaMuscular')?.Null).toBe('YES');
      expect(tipo('interpretacion')?.Type).toBe('text');
      expect(tipo('edadMomentoControl')?.Type).toMatch(/^int/);
    });
  });
});
