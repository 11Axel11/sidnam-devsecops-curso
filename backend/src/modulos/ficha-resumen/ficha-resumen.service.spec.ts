/* eslint-disable @typescript-eslint/no-unsafe-argument -- base simulada en memoria */
import { NotFoundException } from '@nestjs/common';
import { EstadoExpediente } from 'src/common/enums/estadosExpedientes.enum';
import { EstadoValoracion } from 'src/common/enums/estadoValoracion.enum';
import { DatoFuncionalNutricion, TipoEventoImportante } from 'src/modulos/catalogos/entities/catalogos.entities';
import { ValoracionNutricional } from 'src/modulos/nutricion/entities/valoracion-nutricional.entity';
import { EvaluacionBarthel } from 'src/modulos/terapia-fisica/entities/evaluacion-barthel.entity';
import { EventoImportanteTf } from 'src/modulos/terapia-fisica/entities/evento-importante-tf.entity';
import { ValoracionFisioterapeutica } from 'src/modulos/terapia-fisica/entities/valoracion-fisioterapeutica.entity';
import { ValoracionesNutricionalesService } from 'src/modulos/nutricion/valoraciones/valoraciones-nutricionales.service';
import { crearDbSimulada } from 'src/modulos/terapia-fisica/valoraciones/testing/db-simulada';
import { MOTIVOS } from './ficha-resumen.mapeo';
import { FichaResumenService } from './ficha-resumen.service';

/**
 * Ficha resumen (RF-TR-01) con base simulada: cada bloque con datos, sin datos (nunca error), el borrador no cuenta como
 * valoración realizada, el tipo «Caída» se identifica por nombre, 404, expediente inactivo y solo lectura.
 */
const escenario = () => {
  const db = crearDbSimulada([1, 2]);
  db.insertar(TipoEventoImportante, { id: 1, nombre: 'Caída', activo: true });
  db.insertar(TipoEventoImportante, { id: 2, nombre: 'Hospitalización', activo: true });
  db.insertar(DatoFuncionalNutricion, { id: 2, nombre: 'Deambula con ayuda', activo: true });
  db.insertar(DatoFuncionalNutricion, { id: 3, nombre: 'Encamado', activo: false });
  const svc = new FichaResumenService(db.dataSource);
  const barthel = (p: object) => db.insertar(EvaluacionBarthel, { expedienteId: 1, fecha: '2026-10-01', gradoDependencia: 'Dependencia Moderada', puntajeTotal: 70, anulado: false, ...p });
  const nutri = (p: object) => db.insertar(ValoracionNutricional, { expedienteId: 1, fecha: '2026-10-01', estado: EstadoValoracion.VIGENTE, datoFuncionalId: 2, ...p });
  const tf = (p: object) => db.insertar(ValoracionFisioterapeutica, { expedienteId: 1, fecha: '2026-10-02', estado: EstadoValoracion.VIGENTE, antecedentesCaidas: false, usoAyudasBiomecanicas: false, ...p });
  const evento = (p: object) => db.insertar(EventoImportanteTf, { expedienteId: 1, tipoEventoId: 1, fechaHora: new Date('2026-09-10T15:00:00Z'), anulado: false, ...p });
  return { db, svc, barthel, nutri, tf, evento };
};

describe('FichaResumenService (RF-TR-01)', () => {
  it('expediente SIN ningún dato: 200 con todos los bloques en null y su motivo (nunca error)', async () => {
    const { svc } = escenario();
    expect(await svc.obtener(1)).toEqual({
      expedienteId: 1,
      dependenciaBarthel: { datos: null, motivo: MOTIVOS.sinBarthel },
      condicionMovilidad: { datos: null, motivo: MOTIVOS.sinNutricionVigente },
      ayudasBiomecanicas: { datos: null, motivo: MOTIVOS.sinTerapiaFisicaVigente },
      antecedentesCaidas: { datos: null, motivo: MOTIVOS.sinTerapiaFisicaVigente },
      ultimoEventoCaida: { datos: null, motivo: MOTIVOS.sinEventoCaida },
      alergiaMedicamentos: { datos: null, motivo: MOTIVOS.sinNutricionVigente },
      ultimaValoracionTerapiaFisica: { datos: null, motivo: MOTIVOS.sinValoraciones },
      ultimaValoracionNutricion: { datos: null, motivo: MOTIVOS.sinValoraciones },
    });
  });

  it('con datos de todos los orígenes: cada bloque trae lo suyo y motivo null', async () => {
    const { svc, barthel, nutri, tf, evento } = escenario();
    barthel({ fecha: '2026-10-05', gradoDependencia: 'Dependencia Severa' });
    nutri({ fecha: '2026-10-03', alergiaMedicamentos: true, detalleAlergiaMedicamentos: 'Penicilina' });
    tf({ fecha: '2026-10-04', antecedentesCaidas: true, usoAyudasBiomecanicas: true, detalleAyudasBiomecanicas: 'Bastón y andadera' });
    evento({ fechaHora: new Date('2026-09-10T15:00:00Z') });
    const f = await svc.obtener(1);
    expect(f.dependenciaBarthel).toEqual({ datos: { grado: 'Dependencia Severa', fecha: '2026-10-05' }, motivo: null });
    expect(f.condicionMovilidad).toEqual({ datos: { condicion: 'Deambula con ayuda' }, motivo: null });
    expect(f.ayudasBiomecanicas).toEqual({ datos: { usa: true, cuales: 'Bastón y andadera' }, motivo: null });
    expect(f.antecedentesCaidas).toEqual({ datos: { presenta: true }, motivo: null });
    expect(f.ultimoEventoCaida).toEqual({ datos: { fechaHora: new Date('2026-09-10T15:00:00Z') }, motivo: null });
    expect(f.alergiaMedicamentos).toEqual({ datos: { presenta: true, cuales: 'Penicilina' }, motivo: null });
    expect(f.ultimaValoracionTerapiaFisica).toEqual({ datos: { fecha: '2026-10-04', estado: 'vigente' }, motivo: null });
    expect(f.ultimaValoracionNutricion).toEqual({ datos: { fecha: '2026-10-03', estado: 'vigente' }, motivo: null });
  });

  describe('(1) grado de dependencia de Barthel', () => {
    it('la última NO anulada por fecha; las anuladas se ignoran; el empate de fecha lo gana la registrada después', async () => {
      const { svc, barthel } = escenario();
      barthel({ id: 1, fecha: '2026-08-01', gradoDependencia: 'Dependencia Escasa' });
      barthel({ id: 2, fecha: '2026-10-20', gradoDependencia: 'Dependencia Total', anulado: true });
      barthel({ id: 3, fecha: '2026-10-10', gradoDependencia: 'Dependencia Moderada' });
      barthel({ id: 4, fecha: '2026-10-10', gradoDependencia: 'Dependencia Severa' });
      expect((await svc.obtener(1)).dependenciaBarthel.datos).toEqual({ grado: 'Dependencia Severa', fecha: '2026-10-10' });
    });

    it('si solo hay anuladas ⇒ sin datos con su motivo; las de OTRO expediente no cuentan', async () => {
      const { svc, barthel } = escenario();
      barthel({ anulado: true });
      barthel({ expedienteId: 2, gradoDependencia: 'Independencia' });
      expect((await svc.obtener(1)).dependenciaBarthel).toEqual({ datos: null, motivo: MOTIVOS.sinBarthel });
    });

    it('el grado especial de silla de ruedas llega tal cual', async () => {
      const { svc, barthel } = escenario();
      barthel({ gradoDependencia: 'Independencia — uso de silla de ruedas' });
      expect((await svc.obtener(1)).dependenciaBarthel.datos?.grado).toBe('Independencia — uso de silla de ruedas');
    });
  });

  describe('(2) condición de movilidad y alergia a medicamentos (valoración nutricional VIGENTE)', () => {
    it('solo cuenta la vigente: reemplazadas, borradores y anuladas no', async () => {
      const { svc, nutri } = escenario();
      nutri({ estado: EstadoValoracion.REEMPLAZADA, datoFuncionalId: 3 });
      nutri({ estado: EstadoValoracion.BORRADOR, datoFuncionalId: 3 });
      nutri({ estado: EstadoValoracion.VIGENTE, datoFuncionalId: 3, anulado: true });
      expect((await svc.obtener(1)).condicionMovilidad).toEqual({ datos: null, motivo: MOTIVOS.sinNutricionVigente });
    });

    it('un dato funcional desactivado después se sigue mostrando (histórico)', async () => {
      const { svc, nutri } = escenario();
      nutri({ datoFuncionalId: 3 });
      expect((await svc.obtener(1)).condicionMovilidad.datos).toEqual({ condicion: 'Encamado' });
    });

    it('vigente sin dato funcional ⇒ sin datos con motivo propio; la alergia sigue disponible', async () => {
      const { svc, nutri } = escenario();
      nutri({ datoFuncionalId: null, alergiaMedicamentos: false });
      const f = await svc.obtener(1);
      expect(f.condicionMovilidad).toEqual({ datos: null, motivo: MOTIVOS.sinDatoFuncional });
      expect(f.alergiaMedicamentos).toEqual({ datos: { presenta: false, cuales: null }, motivo: null });
    });

    it('sin alergia ⇒ presenta false y cuales null aunque haya un texto guardado', async () => {
      const { svc, nutri } = escenario();
      nutri({ alergiaMedicamentos: false, detalleAlergiaMedicamentos: 'texto residual' });
      expect((await svc.obtener(1)).alergiaMedicamentos.datos).toEqual({ presenta: false, cuales: null });
    });

    it('CA-17 completo (servicio real): deambula con ayuda + deterioro leve + alergia a penicilina ⇒ la ficha trae movilidad y alergia «Penicilina»', async () => {
      const { db, svc } = escenario();
      const nutriSvc = new ValoracionesNutricionalesService(db.dataSource);
      const v = await nutriSvc.crear(1, {
        datoFuncionalId: 2,
        estadoCognitivo: 'con_deterioro' as never,
        nivelDeterioroCognitivo: 'leve',
        alergiaMedicamentos: true,
        detalleAlergiaMedicamentos: 'Penicilina',
      }, 5);
      await nutriSvc.confirmar(v.id, 5);
      const f = await svc.obtener(1);
      expect(f.condicionMovilidad).toEqual({ datos: { condicion: 'Deambula con ayuda' }, motivo: null });
      expect(f.alergiaMedicamentos).toEqual({ datos: { presenta: true, cuales: 'Penicilina' }, motivo: null });
      // el nivel de deterioro cognitivo NO está en la ficha (RF-TR-01 no lo incluye)
      expect(JSON.stringify(f)).not.toMatch(/leve|deterioro|nivelDeterioro/i);
    });
  });

  describe('(3) ayudas biomecánicas y (4a) antecedentes de caídas (valoración TF VIGENTE)', () => {
    it('usa ayudas ⇒ cuáles; no usa ⇒ cuales null aunque haya un texto residual; sin texto ⇒ null', async () => {
      const a = escenario();
      a.tf({ usoAyudasBiomecanicas: true, detalleAyudasBiomecanicas: '  ' });
      expect((await a.svc.obtener(1)).ayudasBiomecanicas.datos).toEqual({ usa: true, cuales: null });
      const b = escenario();
      b.tf({ usoAyudasBiomecanicas: false, detalleAyudasBiomecanicas: 'residual' });
      expect((await b.svc.obtener(1)).ayudasBiomecanicas.datos).toEqual({ usa: false, cuales: null });
    });

    it('solo la vigente: un borrador o una reemplazada no aportan ayudas ni caídas', async () => {
      const { svc, tf } = escenario();
      tf({ estado: EstadoValoracion.BORRADOR, usoAyudasBiomecanicas: true, antecedentesCaidas: true });
      tf({ estado: EstadoValoracion.REEMPLAZADA, usoAyudasBiomecanicas: true, antecedentesCaidas: true });
      const f = await svc.obtener(1);
      expect(f.ayudasBiomecanicas.datos).toBeNull();
      expect(f.antecedentesCaidas.datos).toBeNull();
    });
  });

  describe('(4b) último evento de caída', () => {
    it('el más reciente NO anulado de tipo «Caída»; otros tipos y anulados no cuentan', async () => {
      const { svc, evento } = escenario();
      evento({ id: 1, fechaHora: new Date('2026-06-01T10:00:00Z') });
      evento({ id: 2, fechaHora: new Date('2026-09-01T10:00:00Z') });
      evento({ id: 3, fechaHora: new Date('2026-10-15T10:00:00Z'), anulado: true });
      evento({ id: 4, fechaHora: new Date('2026-10-20T10:00:00Z'), tipoEventoId: 2 }); // Hospitalización
      expect((await svc.obtener(1)).ultimoEventoCaida.datos).toEqual({ fechaHora: new Date('2026-09-01T10:00:00Z') });
    });

    it('el tipo se identifica por nombre sin mayúsculas ni espacios, y un tipo desactivado después sigue contando', async () => {
      const { db, svc, evento } = escenario();
      db.insertar(TipoEventoImportante, { id: 9, nombre: '  CAÍDA ', activo: false });
      evento({ tipoEventoId: 9, fechaHora: new Date('2026-10-01T00:00:00Z') });
      expect((await svc.obtener(1)).ultimoEventoCaida.datos?.fechaHora).toEqual(new Date('2026-10-01T00:00:00Z'));
    });

    it('sin tipo «Caída» en el catálogo, o sin eventos ⇒ sin datos con motivo (no error)', async () => {
      const { db, svc } = escenario();
      db.filas(TipoEventoImportante).splice(0, db.filas(TipoEventoImportante).length);
      expect((await svc.obtener(1)).ultimoEventoCaida).toEqual({ datos: null, motivo: MOTIVOS.sinEventoCaida });
    });
  });

  describe('(5) última valoración de cada departamento', () => {
    it('la vigente gana aunque haya borradores y otras más recientes reemplazadas', async () => {
      const { svc, tf } = escenario();
      tf({ fecha: '2026-10-01', estado: EstadoValoracion.VIGENTE });
      tf({ fecha: '2026-12-01', estado: EstadoValoracion.BORRADOR });
      expect((await svc.obtener(1)).ultimaValoracionTerapiaFisica.datos).toEqual({ fecha: '2026-10-01', estado: 'vigente' });
    });

    it('sin vigente (se anuló): la más reciente reemplazada no anulada', async () => {
      const { svc, nutri } = escenario();
      nutri({ id: 1, fecha: '2026-05-01', estado: EstadoValoracion.REEMPLAZADA });
      nutri({ id: 2, fecha: '2026-07-01', estado: EstadoValoracion.REEMPLAZADA });
      nutri({ id: 3, fecha: '2026-09-01', estado: EstadoValoracion.REEMPLAZADA, anulado: true });
      nutri({ id: 4, fecha: '2026-10-01', estado: EstadoValoracion.VIGENTE, anulado: true });
      expect((await svc.obtener(1)).ultimaValoracionNutricion.datos).toEqual({ fecha: '2026-07-01', estado: 'reemplazada' });
    });

    it('SOLO un borrador ⇒ datos null con «Hay una valoración en elaboración, aún sin confirmar», sin fecha ni estado del borrador', async () => {
      const { svc, tf } = escenario();
      tf({ fecha: '2026-10-09', estado: EstadoValoracion.BORRADOR });
      const b = (await svc.obtener(1)).ultimaValoracionTerapiaFisica;
      expect(b).toEqual({ datos: null, motivo: 'Hay una valoración en elaboración, aún sin confirmar' });
      expect(JSON.stringify(b)).not.toContain('2026-10-09');
      expect(JSON.stringify(b)).not.toContain('borrador');
    });

    it('un borrador anulado no cuenta como «en elaboración»; sin nada ⇒ «No hay valoraciones registradas»', async () => {
      const { svc, tf } = escenario();
      tf({ estado: EstadoValoracion.BORRADOR, anulado: true });
      expect((await svc.obtener(1)).ultimaValoracionTerapiaFisica.motivo).toBe(MOTIVOS.sinValoraciones);
    });

    it('cada departamento es independiente', async () => {
      const { svc, tf } = escenario();
      tf({ fecha: '2026-10-02' });
      const f = await svc.obtener(1);
      expect(f.ultimaValoracionTerapiaFisica.datos).toEqual({ fecha: '2026-10-02', estado: 'vigente' });
      expect(f.ultimaValoracionNutricion.datos).toBeNull();
    });
  });

  describe('expediente', () => {
    it('inexistente ⇒ 404', async () => {
      const { svc } = escenario();
      await expect(svc.obtener(99)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('INACTIVO se consulta igual (200, con sus datos)', async () => {
      const { db, svc, barthel } = escenario();
      barthel({ gradoDependencia: 'Dependencia Escasa' });
      db.cambiarEstadoExpediente(1, EstadoExpediente.Inactivo);
      expect((await svc.obtener(1)).dependenciaBarthel.datos?.grado).toBe('Dependencia Escasa');
    });

    it('los datos de otro expediente no se mezclan', async () => {
      const { svc, barthel, nutri, tf, evento } = escenario();
      barthel({ expedienteId: 2 });
      nutri({ expedienteId: 2 });
      tf({ expedienteId: 2 });
      evento({ expedienteId: 2 });
      const f = await svc.obtener(1);
      expect([f.dependenciaBarthel, f.condicionMovilidad, f.ayudasBiomecanicas, f.ultimoEventoCaida].every((b) => b.datos === null)).toBe(true);
    });

    it('es de SOLO LECTURA: no inserta, no actualiza ni bloquea nada', async () => {
      const { db, svc, barthel, nutri, tf, evento } = escenario();
      barthel({});
      nutri({});
      tf({});
      evento({});
      const antes = JSON.stringify([db.filas(EvaluacionBarthel), db.filas(ValoracionNutricional), db.filas(ValoracionFisioterapeutica), db.filas(EventoImportanteTf)]);
      await svc.obtener(1);
      expect(JSON.stringify([db.filas(EvaluacionBarthel), db.filas(ValoracionNutricional), db.filas(ValoracionFisioterapeutica), db.filas(EventoImportanteTf)])).toBe(antes);
      expect(db.log.filter((l) => /^(update|lock)/.test(l))).toEqual([]);
    });
  });
});
