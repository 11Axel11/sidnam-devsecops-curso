/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call -- base simulada en memoria */
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { EstadoValoracion } from 'src/common/enums/estadoValoracion.enum';
import { hoyCostaRica } from 'src/common/utils/hoyCostaRica';
import { DatoFuncionalNutricion } from 'src/modulos/catalogos/entities/catalogos.entities';
import { crearDbSimulada } from 'src/modulos/terapia-fisica/valoraciones/testing/db-simulada';
import { ValoracionNutricional } from '../entities/valoracion-nutricional.entity';
import { EstadoCognitivo } from '../enums/estado-cognitivo.enum';
import { ValoracionesNutricionalesService } from './valoraciones-nutricionales.service';

const escenario = (expedientes: number[] = [1, 2]) => {
  const db = crearDbSimulada(expedientes);
  db.insertar(DatoFuncionalNutricion, { id: 1, nombre: 'Ambulante', activo: true });
  db.insertar(DatoFuncionalNutricion, { id: 2, nombre: 'Deambula con ayuda', activo: true });
  db.insertar(DatoFuncionalNutricion, { id: 3, nombre: 'Encamado', activo: false });
  const svc = new ValoracionesNutricionalesService(db.dataSource);
  let seq = 100;
  /** Inserta una valoración directamente (con los defaults de la columna que aplica MySQL). */
  const valoracion = (parcial: object = {}): Record<string, any> & { id: number } =>
    db.insertar(ValoracionNutricional, {
      id: ++seq,
      expedienteId: 1,
      fecha: '2026-10-01',
      estado: EstadoValoracion.BORRADOR,
      datoFuncionalId: 2,
      ...parcial,
    });
  return { db, svc, valoracion };
};

const capturar = async (p: Promise<unknown>): Promise<any> => {
  try {
    await p;
  } catch (e) {
    return e;
  }
  return undefined;
};

describe('ValoracionesNutricionalesService (RN-01/02/03, RF-NU-04)', () => {
  describe('crear', () => {
    it('RN-01: expediente inexistente → 404 y no se crea nada', async () => {
      const { svc, db } = escenario();
      await expect(svc.crear(99, {}, 5)).rejects.toBeInstanceOf(NotFoundException);
      expect(db.filas(ValoracionNutricional)).toHaveLength(0);
    });

    it('nace en BORRADOR, responsable = usuario del token, fecha = hoy (Costa Rica) y defaults de RF-NU-04', async () => {
      const { svc } = escenario();
      const v = await svc.crear(1, {}, 42);
      expect(v).toMatchObject({
        expedienteId: 1,
        estado: EstadoValoracion.BORRADOR,
        usuarioResponsableId: 42,
        creadoPorId: 42,
        fecha: hoyCostaRica(),
        problemaVisual: false,
        problemaCavidadOral: false,
        alergiaMedicamentos: false,
        depresion: false,
        ansiedad: false,
        estadoCognitivo: EstadoCognitivo.NORMAL,
        anulado: false,
      });
      expect(v.modificadoPorId).toBeUndefined();
    });

    it('guardado parcial: acepta un borrador casi vacío (sin dato funcional)', async () => {
      const { svc } = escenario();
      const v = await svc.crear(1, { problemaVisual: true }, 5);
      expect(v.problemaVisual).toBe(true);
      expect(v.datoFuncionalId ?? null).toBeNull();
    });

    it('CA-17: deambula con ayuda + deterioro leve + alergia a penicilina se conserva íntegro', async () => {
      const { svc } = escenario();
      const v = await svc.crear(
        1,
        {
          datoFuncionalId: 2,
          estadoCognitivo: EstadoCognitivo.CON_DETERIORO,
          nivelDeterioroCognitivo: 'leve',
          alergiaMedicamentos: true,
          detalleAlergiaMedicamentos: 'Penicilina',
        },
        5,
      );
      expect(v).toMatchObject({
        datoFuncionalId: 2,
        estadoCognitivo: 'con_deterioro',
        nivelDeterioroCognitivo: 'leve',
        alergiaMedicamentos: true,
        detalleAlergiaMedicamentos: 'Penicilina',
      });
    });

    it('CA-06 análogo: un detalle de alergia de >2000 caracteres se conserva íntegro', async () => {
      const { svc } = escenario();
      const largo = 'Reacción alérgica severa a antibióticos betalactámicos áéíóú ñ. '.repeat(60);
      expect(largo.length).toBeGreaterThan(2000);
      const v = await svc.crear(1, { alergiaMedicamentos: true, detalleAlergiaMedicamentos: largo }, 5);
      expect(v.detalleAlergiaMedicamentos).toBe(largo);
    });

    it('fecha futura o inexistente → 400 y no se guarda', async () => {
      const { svc, db } = escenario();
      await expect(svc.crear(1, { fecha: '2999-01-01' }, 5)).rejects.toBeInstanceOf(BadRequestException);
      await expect(svc.crear(1, { fecha: '2026-02-30' }, 5)).rejects.toBeInstanceOf(BadRequestException);
      expect(db.filas(ValoracionNutricional)).toHaveLength(0);
    });

    it('datos contradictorios → 400 con TODOS los errores a la vez', async () => {
      const { svc } = escenario();
      const e = await capturar(
        svc.crear(1, { fecha: '2999-01-01', detalleAlergiaMedicamentos: 'x', nivelDeterioroCognitivo: 'severo', datoFuncionalId: 99 }, 5),
      );
      expect(e).toBeInstanceOf(BadRequestException);
      expect(e.getResponse()).toEqual({
        message: 'Datos inconsistentes',
        errores: [
          'La fecha de la valoración no puede ser posterior a hoy',
          'detalleAlergiaMedicamentos solo aplica si alergiaMedicamentos es true',
          'nivelDeterioroCognitivo solo aplica si estadoCognitivo es con_deterioro',
          'datoFuncionalId 99 no existe en el catálogo',
        ],
      });
    });

    it('dato funcional inexistente o INACTIVO se rechaza al asignarlo (400)', async () => {
      const { svc, db } = escenario();
      expect((await capturar(svc.crear(1, { datoFuncionalId: 99 }, 5))).getResponse().errores).toEqual([
        'datoFuncionalId 99 no existe en el catálogo',
      ]);
      expect((await capturar(svc.crear(1, { datoFuncionalId: 3 }, 5))).getResponse().errores).toEqual([
        'datoFuncionalId 3 ("Encamado") está desactivado',
      ]);
      expect(db.filas(ValoracionNutricional)).toHaveLength(0);
    });
  });

  describe('actualizar (solo borrador)', () => {
    it('edita un borrador, mezcla con lo guardado y estampa modificadoPorId', async () => {
      const { svc, valoracion, db } = escenario();
      const b = valoracion({ problemaVisual: true, creadoPorId: 1 });
      const v = await svc.actualizar(b.id, { depresion: true }, 9);
      expect(v).toMatchObject({ problemaVisual: true, depresion: true, modificadoPorId: 9, creadoPorId: 1, estado: 'borrador' });
      expect(db.log).toContain(`lock:ValoracionNutricional:${b.id}`); // bloquea la fila: no pisa una confirmación en curso
    });

    it.each([EstadoValoracion.VIGENTE, EstadoValoracion.REEMPLAZADA])('una %s NO se edita (409) y no cambia', async (estado) => {
      const { svc, valoracion } = escenario();
      const c = valoracion({ estado });
      await expect(svc.actualizar(c.id, { depresion: true }, 9)).rejects.toBeInstanceOf(ConflictException);
      expect(c.depresion).toBe(false); // no se aplicó el cambio
    });

    it('una anulada no se edita (409); id inexistente → 404', async () => {
      const { svc, valoracion } = escenario();
      await expect(svc.actualizar(valoracion({ anulado: true }).id, { depresion: true }, 9)).rejects.toBeInstanceOf(ConflictException);
      await expect(svc.actualizar(999, {}, 9)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('la coherencia se evalúa sobre el estado FINAL: apagar la alergia con detalle guardado → 400 y no cambia', async () => {
      const { svc, valoracion } = escenario();
      const b = valoracion({ alergiaMedicamentos: true, detalleAlergiaMedicamentos: 'Penicilina' });
      await expect(svc.actualizar(b.id, { alergiaMedicamentos: false }, 9)).rejects.toBeInstanceOf(BadRequestException);
      expect(b.alergiaMedicamentos).toBe(true); // rollback
      // Apagándola y limpiando el detalle en la misma petición sí funciona:
      await expect(svc.actualizar(b.id, { alergiaMedicamentos: false, detalleAlergiaMedicamentos: null }, 9)).resolves.toMatchObject({
        alergiaMedicamentos: false,
        detalleAlergiaMedicamentos: null,
      });
    });

    it('pasar a «normal» con nivel guardado → 400; con nivel null en la misma petición → ok', async () => {
      const { svc, valoracion } = escenario();
      const b = valoracion({ estadoCognitivo: EstadoCognitivo.CON_DETERIORO, nivelDeterioroCognitivo: 'leve' });
      await expect(svc.actualizar(b.id, { estadoCognitivo: EstadoCognitivo.NORMAL }, 9)).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        svc.actualizar(b.id, { estadoCognitivo: EstadoCognitivo.NORMAL, nivelDeterioroCognitivo: null }, 9),
      ).resolves.toMatchObject({ estadoCognitivo: 'normal', nivelDeterioroCognitivo: null });
    });

    it('fecha: null se ignora (no se puede vaciar); fecha futura → 400', async () => {
      const { svc, valoracion } = escenario();
      const b = valoracion();
      await expect(svc.actualizar(b.id, { fecha: null as never }, 9)).resolves.toMatchObject({ fecha: '2026-10-01' });
      await expect(svc.actualizar(b.id, { fecha: '2999-01-01' }, 9)).rejects.toBeInstanceOf(BadRequestException);
    });

    describe('dato funcional: solo se exige activo al ASIGNARLO', () => {
      it('cambiar a uno inactivo o inexistente → 400', async () => {
        const { svc, valoracion } = escenario();
        const b = valoracion();
        await expect(svc.actualizar(b.id, { datoFuncionalId: 3 }, 9)).rejects.toBeInstanceOf(BadRequestException);
        await expect(svc.actualizar(b.id, { datoFuncionalId: 99 }, 9)).rejects.toBeInstanceOf(BadRequestException);
        expect(b.datoFuncionalId).toBe(2);
      });

      it('uno desactivado DESPUÉS de asignarlo no impide corregir otros campos ni reenviar el mismo id', async () => {
        const { svc, valoracion, db } = escenario();
        const b = valoracion({ datoFuncionalId: 2 });
        db.filas(DatoFuncionalNutricion)[1].activo = false;
        await expect(svc.actualizar(b.id, { depresion: true }, 9)).resolves.toMatchObject({ depresion: true, datoFuncionalId: 2 });
        await expect(svc.actualizar(b.id, { datoFuncionalId: 2 }, 9)).resolves.toMatchObject({ datoFuncionalId: 2 });
      });

      it('cambiar a uno activo funciona; limpiar con null está permitido (borrador)', async () => {
        const { svc, valoracion } = escenario();
        const b = valoracion({ datoFuncionalId: 2 });
        await expect(svc.actualizar(b.id, { datoFuncionalId: 1 }, 9)).resolves.toMatchObject({ datoFuncionalId: 1 });
        await expect(svc.actualizar(b.id, { datoFuncionalId: null }, 9)).resolves.toMatchObject({ datoFuncionalId: null });
      });
    });
  });

  describe('confirmar (borrador → vigente) — RN-03', () => {
    it('la confirma y la vigente anterior pasa a reemplazada, en una sola transacción', async () => {
      const { svc, valoracion, db } = escenario();
      const vieja = valoracion({ estado: EstadoValoracion.VIGENTE });
      const nueva = valoracion();
      const r = await svc.confirmar(nueva.id, 9);
      expect(r).toMatchObject({ id: nueva.id, estado: EstadoValoracion.VIGENTE, modificadoPorId: 9 });
      expect(vieja.estado).toBe(EstadoValoracion.REEMPLAZADA);
      // candados en el orden de la convención: expediente → valoración → update
      const iExp = db.log.indexOf('lock-expediente:1');
      const iVal = db.log.indexOf(`lock:ValoracionNutricional:${nueva.id}`);
      const iUpd = db.log.findIndex((e) => e.startsWith('update:'));
      expect(iExp).toBeLessThan(iVal);
      expect(iVal).toBeLessThan(iUpd);
    });

    it('INVARIANTE: tras varias confirmaciones sucesivas nunca hay dos vigentes (no anuladas)', async () => {
      const { svc, valoracion, db } = escenario();
      const ids = [valoracion().id, valoracion().id, valoracion().id];
      for (const id of ids) {
        await svc.confirmar(id, 9);
        expect(db.filas(ValoracionNutricional).filter((f) => f.estado === 'vigente' && !f.anulado)).toHaveLength(1);
      }
    });

    it('no toca la vigente de OTRO expediente, ni anuladas, ni reemplazadas', async () => {
      const { svc, valoracion } = escenario();
      const otra = valoracion({ expedienteId: 2, estado: EstadoValoracion.VIGENTE });
      const anulada = valoracion({ estado: EstadoValoracion.VIGENTE, anulado: true });
      const reemplazada = valoracion({ estado: EstadoValoracion.REEMPLAZADA });
      await svc.confirmar(valoracion().id, 9);
      expect(otra.estado).toBe(EstadoValoracion.VIGENTE);
      expect(anulada.estado).toBe(EstadoValoracion.VIGENTE);
      expect(reemplazada.estado).toBe(EstadoValoracion.REEMPLAZADA);
    });

    it('sin dato funcional → 400 {faltantes:["datoFuncionalId"]} y NO cambia nada', async () => {
      const { svc, valoracion, db } = escenario();
      const vieja = valoracion({ estado: EstadoValoracion.VIGENTE });
      const b = valoracion({ datoFuncionalId: null });
      const e = await capturar(svc.confirmar(b.id, 9));
      expect(e).toBeInstanceOf(BadRequestException);
      expect(e.getResponse()).toEqual({
        message: 'Faltan campos obligatorios para confirmar la valoración',
        faltantes: ['datoFuncionalId'],
      });
      expect(b.estado).toBe(EstadoValoracion.BORRADOR);
      expect(vieja.estado).toBe(EstadoValoracion.VIGENTE);
      expect(db.log.some((x) => x.startsWith('update:'))).toBe(false);
    });

    it('alergia sin detalle y deterioro sin nivel → faltantes en el orden fijo', async () => {
      const { svc, valoracion } = escenario();
      const b = valoracion({ alergiaMedicamentos: true, estadoCognitivo: EstadoCognitivo.CON_DETERIORO });
      expect((await capturar(svc.confirmar(b.id, 9))).getResponse().faltantes).toEqual([
        'detalleAlergiaMedicamentos',
        'nivelDeterioroCognitivo',
      ]);
    });

    it('con todo completo (CA-17) confirma', async () => {
      const { svc, valoracion } = escenario();
      const b = valoracion({
        alergiaMedicamentos: true,
        detalleAlergiaMedicamentos: 'Penicilina',
        estadoCognitivo: EstadoCognitivo.CON_DETERIORO,
        nivelDeterioroCognitivo: 'leve',
      });
      await expect(svc.confirmar(b.id, 9)).resolves.toMatchObject({ estado: EstadoValoracion.VIGENTE });
    });

    it.each([EstadoValoracion.VIGENTE, EstadoValoracion.REEMPLAZADA])('confirmar una %s → 409', async (estado) => {
      const { svc, valoracion } = escenario();
      await expect(svc.confirmar(valoracion({ estado }).id, 9)).rejects.toBeInstanceOf(ConflictException);
    });

    it('confirmar una anulada → 409; id inexistente → 404', async () => {
      const { svc, valoracion } = escenario();
      await expect(svc.confirmar(valoracion({ anulado: true }).id, 9)).rejects.toBeInstanceOf(ConflictException);
      await expect(svc.confirmar(12345, 9)).rejects.toThrow('Valoración nutricional 12345 no existe');
    });
  });

  describe('anular — RN-02 (nunca se borra)', () => {
    it('marca anulado con motivo, usuario y fecha; la fila sigue existiendo', async () => {
      const { svc, valoracion, db } = escenario();
      const b = valoracion();
      const r = await svc.anular(b.id, 'Cargada en el expediente equivocado', 9);
      expect(r).toMatchObject({ anulado: true, motivoAnulacion: 'Cargada en el expediente equivocado', anuladoPorId: 9, modificadoPorId: 9 });
      expect(r.fechaAnulacion).toBeInstanceOf(Date);
      expect(db.filas(ValoracionNutricional)).toHaveLength(1);
    });

    it('anular la vigente NO resucita a la anterior ni anula otras; el expediente queda sin vigente', async () => {
      const { svc, valoracion } = escenario();
      const anterior = valoracion({ estado: EstadoValoracion.REEMPLAZADA });
      const vigente = valoracion({ estado: EstadoValoracion.VIGENTE });
      await svc.anular(vigente.id, 'Error', 9);
      expect(anterior).toMatchObject({ estado: EstadoValoracion.REEMPLAZADA, anulado: false });
      expect(vigente.estado).toBe(EstadoValoracion.VIGENTE); // conserva su estado; deja de contar como vigente
      await expect(svc.obtenerVigente(1)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('doble anulación → 409; id inexistente → 404', async () => {
      const { svc, valoracion } = escenario();
      const b = valoracion();
      await svc.anular(b.id, 'x', 9);
      await expect(svc.anular(b.id, 'otra vez', 9)).rejects.toBeInstanceOf(ConflictException);
      await expect(svc.anular(404, 'x', 9)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('lecturas', () => {
    it('historial: solo cabeceras (sin objeto datoFuncional), de la más reciente a la más antigua, incluye anuladas', async () => {
      const { svc, valoracion } = escenario();
      valoracion({ fecha: '2026-09-01', estado: EstadoValoracion.REEMPLAZADA });
      valoracion({ fecha: '2026-10-01', estado: EstadoValoracion.VIGENTE });
      valoracion({ fecha: '2026-10-15', anulado: true });
      const h = await svc.listar(1);
      expect(h.map((x) => x.fecha)).toEqual(['2026-10-15', '2026-10-01', '2026-09-01']);
      expect(h[0]).not.toHaveProperty('datoFuncional');
      expect(h[0]).toHaveProperty('datoFuncionalId', 2);
    });

    it('listar / vigente con expediente inexistente → 404', async () => {
      const { svc } = escenario();
      await expect(svc.listar(77)).rejects.toBeInstanceOf(NotFoundException);
      await expect(svc.obtenerVigente(77)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('vigente: solo la vigente no anulada, con el dato funcional resuelto; 404 si no hay', async () => {
      const { svc, valoracion } = escenario();
      valoracion({ estado: EstadoValoracion.REEMPLAZADA });
      valoracion();
      await expect(svc.obtenerVigente(1)).rejects.toThrow('El expediente 1 no tiene una valoración nutricional vigente');
      const vig = valoracion({ estado: EstadoValoracion.VIGENTE });
      await expect(svc.obtenerVigente(1)).resolves.toMatchObject({
        id: vig.id,
        datoFuncional: { id: 2, nombre: 'Deambula con ayuda', activo: true },
      });
    });

    it('un dato funcional DESACTIVADO después se sigue resolviendo en lecturas históricas', async () => {
      const { svc, valoracion, db } = escenario();
      const v = valoracion({ estado: EstadoValoracion.VIGENTE, datoFuncionalId: 2 });
      db.filas(DatoFuncionalNutricion)[1].activo = false;
      const d = await svc.obtenerDetalle(v.id);
      expect(d.datoFuncional).toEqual({ id: 2, nombre: 'Deambula con ayuda', activo: false });
      expect((await svc.obtenerVigente(1)).datoFuncional).toEqual({ id: 2, nombre: 'Deambula con ayuda', activo: false });
    });

    it('detalle: cualquier estado (incluida anulada); sin dato funcional → datoFuncional: null; no filtra la relación ni el expediente', async () => {
      const { svc, valoracion } = escenario();
      for (const parcial of [{ estado: EstadoValoracion.BORRADOR }, { estado: EstadoValoracion.REEMPLAZADA }, { anulado: true }]) {
        const v = valoracion({ ...parcial, datoFuncionalId: null });
        const d = await svc.obtenerDetalle(v.id);
        expect(d).toMatchObject({ id: v.id, datoFuncionalId: null, datoFuncional: null });
        expect(d).not.toHaveProperty('expediente');
      }
    });

    it('detalle inexistente → 404', async () => {
      await expect(escenario().svc.obtenerDetalle(999)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  it('no existe ninguna operación de borrado físico', () => {
    const metodos = Object.getOwnPropertyNames(ValoracionesNutricionalesService.prototype);
    expect(metodos.filter((m) => /elimin|delete|remove|borrar/i.test(m))).toEqual([]);
  });
});
