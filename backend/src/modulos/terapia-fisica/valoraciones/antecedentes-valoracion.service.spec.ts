/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return -- base simulada en memoria */
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { EstadoValoracion } from 'src/common/enums/estadoValoracion.enum';
import { AntecedentePersonal, TipoAntecedenteTraumatico } from 'src/modulos/catalogos/entities/catalogos.entities';
import { AntecedenteTraumatico } from '../entities/antecedente-traumatico.entity';
import { ValoracionFisioterapeutica } from '../entities/valoracion-fisioterapeutica.entity';
import { ValoracionTfAntecedentePersonal } from '../entities/valoracion-tf-antecedente-personal.entity';
import { AntecedentesValoracionService } from './antecedentes-valoracion.service';
import { crearDbSimulada } from './testing/db-simulada';

/** Escenario: catálogo de N antecedentes activos, tipos (incl. «Otro») y una valoración. */
const escenario = (opts: { nAntecedentes?: number; estado?: EstadoValoracion; anulada?: boolean } = {}) => {
  const db = crearDbSimulada([1]);
  const nombres = Array.from({ length: opts.nAntecedentes ?? 17 }, (_, i) => `Antecedente ${i + 1}`);
  nombres.forEach((nombre, i) => db.insertar(AntecedentePersonal, { id: i + 1, nombre, activo: true }));
  db.insertar(TipoAntecedenteTraumatico, { id: 1, nombre: 'Fractura', activo: true });
  db.insertar(TipoAntecedenteTraumatico, { id: 2, nombre: 'Otro', activo: true });
  db.insertar(TipoAntecedenteTraumatico, { id: 3, nombre: 'Luxación', activo: false });
  const valoracion = db.insertar(ValoracionFisioterapeutica, {
    id: 10,
    expedienteId: 1,
    estado: opts.estado ?? EstadoValoracion.BORRADOR,
    anulado: opts.anulada ?? false,
  });
  const svc = new AntecedentesValoracionService(db.dataSource);
  const personales = () => db.filas(ValoracionTfAntecedentePersonal);
  const traumaticos = () => db.filas(AntecedenteTraumatico);
  return { db, svc, valoracion, personales, traumaticos };
};

const item = (antecedenteId: number, presente: boolean, observacion?: string | null) => ({ antecedenteId, presente, observacion });

describe('AntecedentesValoracionService — personales (upsert, RF-TF-02)', () => {
  it('guarda el estado de TODOS los ítems activos del catálogo (17 hoy), presentes y descartados', async () => {
    const { svc, personales } = escenario({ nAntecedentes: 17 });
    const antecedentes = Array.from({ length: 17 }, (_, i) => item(i + 1, i < 3, i === 0 ? 'Desde 2019' : null));
    const r = await svc.registrarPersonales(10, { antecedentes }, 5);
    expect(r).toHaveLength(17);
    expect(personales()).toHaveLength(17);
    expect(r.filter((x) => x.presente)).toHaveLength(3);
    expect(r[0]).toMatchObject({ antecedenteId: 1, nombre: 'Antecedente 1', activo: true, presente: true, observacion: 'Desde 2019', creadoPorId: 5 });
    expect(r[16]).toMatchObject({ presente: false, observacion: null }); // «evaluado y descartado» queda registrado
  });

  it('no asume cantidad: funciona con un catálogo de 25 ítems y con un solo ítem', async () => {
    const e = escenario({ nAntecedentes: 25 });
    await e.svc.registrarPersonales(10, { antecedentes: Array.from({ length: 25 }, (_, i) => item(i + 1, false)) }, 5);
    expect(e.personales()).toHaveLength(25);
    const u = escenario({ nAntecedentes: 3 });
    await u.svc.registrarPersonales(10, { antecedentes: [item(2, true)] }, 5);
    expect(u.personales()).toHaveLength(1);
  });

  it('IDEMPOTENTE: reenviar lo mismo no duplica filas, no cambia nada ni toca la auditoría', async () => {
    const { svc, personales } = escenario();
    const cuerpo = { antecedentes: [item(1, true, 'x'), item(2, false)] };
    await svc.registrarPersonales(10, cuerpo, 5);
    const ids = personales().map((f) => f.id);
    await svc.registrarPersonales(10, cuerpo, 9); // otro usuario reenvía lo mismo
    expect(personales().map((f) => f.id)).toEqual(ids);
    expect(personales()).toHaveLength(2);
    expect(personales().every((f) => f.modificadoPorId === undefined)).toBe(true); // nadie «modificó» nada
    expect(personales().every((f) => f.creadoPorId === 5)).toBe(true);
  });

  it('upsert: cambiar presente/observación actualiza la MISMA fila y audita solo lo que cambió', async () => {
    const { svc, personales } = escenario();
    await svc.registrarPersonales(10, { antecedentes: [item(1, false), item(2, false)] }, 5);
    const r = await svc.registrarPersonales(10, { antecedentes: [item(1, true, 'Nuevo hallazgo'), item(2, false)] }, 9);
    expect(personales()).toHaveLength(2);
    const [a, b] = personales();
    expect(a).toMatchObject({ presente: true, observacion: 'Nuevo hallazgo', modificadoPorId: 9, creadoPorId: 5 });
    expect(b.modificadoPorId).toBeUndefined(); // el ítem 2 no cambió
    expect(r.find((x) => x.antecedenteId === 1)?.presente).toBe(true);
  });

  it('envío parcial: los ítems no enviados quedan intactos (no se borran)', async () => {
    const { svc, personales } = escenario();
    await svc.registrarPersonales(10, { antecedentes: [item(1, true), item(2, true)] }, 5);
    await svc.registrarPersonales(10, { antecedentes: [item(3, false)] }, 5);
    expect(personales().map((f) => f.antecedenteId)).toEqual([1, 2, 3]);
    expect(personales().find((f) => f.antecedenteId === 1)?.presente).toBe(true);
  });

  it('la observación en blanco se guarda como null; reenviar sin observación no cuenta como cambio si ya era null', async () => {
    const { svc, personales } = escenario();
    await svc.registrarPersonales(10, { antecedentes: [item(1, false, '   ')] }, 5);
    expect(personales()[0].observacion).toBeNull();
    await svc.registrarPersonales(10, { antecedentes: [item(1, false)] }, 7);
    expect(personales()[0].modificadoPorId).toBeUndefined();
  });

  describe('ítems inexistentes o inactivos → 400 y NO se guarda nada (todo o nada)', () => {
    it('inexistente', async () => {
      const { svc, personales } = escenario({ nAntecedentes: 3 });
      let error: any;
      try {
        await svc.registrarPersonales(10, { antecedentes: [item(1, true), item(99, true)] }, 5);
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.getResponse().errores).toEqual(['antecedenteId 99 no existe en el catálogo']);
      expect(personales()).toHaveLength(0); // ni siquiera el ítem 1, que era válido
    });

    it('inactivo (lista TODOS los problemas de una vez)', async () => {
      const { svc, db, personales } = escenario({ nAntecedentes: 3 });
      db.filas(AntecedentePersonal)[1].activo = false; // «Antecedente 2» desactivado
      let error: any;
      try {
        await svc.registrarPersonales(10, { antecedentes: [item(1, true), item(2, true), item(77, false)] }, 5);
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.getResponse().errores).toEqual([
        'antecedenteId 2 ("Antecedente 2") está desactivado',
        'antecedenteId 77 no existe en el catálogo',
      ]);
      expect(personales()).toHaveLength(0);
    });

    it('un ítem desactivado DESPUÉS de evaluado sigue resolviéndose en lectura (histórico)', async () => {
      const { svc, db } = escenario({ nAntecedentes: 3 });
      await svc.registrarPersonales(10, { antecedentes: [item(2, true, 'x')] }, 5);
      db.filas(AntecedentePersonal)[1].activo = false;
      const reenvio = svc.registrarPersonales(10, { antecedentes: [item(2, false)] }, 5);
      await expect(reenvio).rejects.toBeInstanceOf(BadRequestException); // ya no se puede escribir
      const lectura = await svc.registrarPersonales(10, { antecedentes: [item(1, false)] }, 5);
      expect(lectura.find((x) => x.antecedenteId === 2)).toMatchObject({ nombre: 'Antecedente 2', activo: false, presente: true });
    });
  });

  describe('solo en borrador (409) y bloqueando la fila de la valoración', () => {
    it.each([EstadoValoracion.VIGENTE, EstadoValoracion.REEMPLAZADA])('valoración %s → 409 y no se escribe', async (estado) => {
      const { svc, personales } = escenario({ estado });
      await expect(svc.registrarPersonales(10, { antecedentes: [item(1, true)] }, 5)).rejects.toBeInstanceOf(ConflictException);
      expect(personales()).toHaveLength(0);
    });

    it('valoración anulada → 409', async () => {
      const { svc } = escenario({ anulada: true });
      await expect(svc.registrarPersonales(10, { antecedentes: [item(1, true)] }, 5)).rejects.toBeInstanceOf(ConflictException);
    });

    it('el estado se comprueba ANTES que el cuerpo: valoración cerrada + ítem inexistente → 409, no 400', async () => {
      const { svc } = escenario({ estado: EstadoValoracion.VIGENTE });
      await expect(svc.registrarPersonales(10, { antecedentes: [item(999, true)] }, 5)).rejects.toBeInstanceOf(ConflictException);
    });

    it('valoración inexistente → 404', async () => {
      const { svc } = escenario();
      await expect(svc.registrarPersonales(999, { antecedentes: [item(1, true)] }, 5)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('toma el candado de la valoración (FOR UPDATE) antes de leer o escribir hijos', async () => {
      const { svc, db } = escenario();
      await svc.registrarPersonales(10, { antecedentes: [item(1, true)] }, 5);
      expect(db.log).toContain('lock:ValoracionFisioterapeutica:10');
      expect(db.log.some((e) => e.startsWith('lock-expediente'))).toBe(false); // solo confirmar toma el del expediente
    });
  });
});

describe('AntecedentesValoracionService — traumáticos (registros independientes, RF-TF-03)', () => {
  const dosFracturasYCirugia = async (svc: AntecedentesValoracionService) => {
    const a = await svc.crearTraumatico(10, { tipoId: 1, descripcion: 'Fractura de cadera', localizacionAnatomica: 'Cadera derecha', tiempoTranscurrido: '3 años' }, 5);
    const b = await svc.crearTraumatico(10, { tipoId: 1, localizacionAnatomica: 'Muñeca izquierda', tiempoTranscurrido: '10 años' }, 5);
    const c = await svc.crearTraumatico(10, { tipoId: 2, descripcion: 'Cirugía de columna' }, 5);
    return [a, b, c];
  };

  it('CA-03: dos fracturas y una cirugía quedan como 3 registros independientes (0..N, no un arreglo fijo)', async () => {
    const { svc, traumaticos } = escenario();
    const [a, b, c] = await dosFracturasYCirugia(svc);
    expect(traumaticos()).toHaveLength(3);
    expect(new Set([a.id, b.id, c.id]).size).toBe(3);
    expect(a).toMatchObject({ tipoId: 1, tipo: { nombre: 'Fractura' }, localizacionAnatomica: 'Cadera derecha', anulado: false, creadoPorId: 5 });
  });

  it('se pueden agregar más de 4 (no es un diseño de casillas fijas)', async () => {
    const { svc, traumaticos } = escenario();
    for (let i = 0; i < 7; i++) await svc.crearTraumatico(10, { tipoId: 1, localizacionAnatomica: `Zona ${i}` }, 5);
    expect(traumaticos()).toHaveLength(7);
  });

  it('solo el tipo es obligatorio para un tipo común: sin descripción, localización ni tiempo está bien', async () => {
    const { svc } = escenario();
    await expect(svc.crearTraumatico(10, { tipoId: 1 }, 5)).resolves.toMatchObject({ descripcion: null, localizacionAnatomica: null });
  });

  describe('«Otro» exige descripción', () => {
    it('crear «Otro» sin descripción (ausente, null o en blanco) → 400 y no se crea', async () => {
      const { svc, traumaticos } = escenario();
      for (const descripcion of [undefined, null, '', '   ']) {
        let error: any;
        try {
          await svc.crearTraumatico(10, { tipoId: 2, descripcion }, 5);
        } catch (e) {
          error = e;
        }
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.getResponse().errores[0]).toMatch(/descripcion es obligatoria/);
      }
      expect(traumaticos()).toHaveLength(0);
    });

    it('crear «Otro» con descripción → ok', async () => {
      const { svc } = escenario();
      await expect(svc.crearTraumatico(10, { tipoId: 2, descripcion: 'Atropello' }, 5)).resolves.toMatchObject({ tipo: { nombre: 'Otro' } });
    });

    it('PATCH: vaciar la descripción de un «Otro» → 400 y no cambia', async () => {
      const { svc, traumaticos } = escenario();
      const t = await svc.crearTraumatico(10, { tipoId: 2, descripcion: 'Atropello' }, 5);
      await expect(svc.actualizarTraumatico(t.id, { descripcion: null }, 5)).rejects.toBeInstanceOf(BadRequestException);
      expect(traumaticos()[0].descripcion).toBe('Atropello');
    });

    it('PATCH: cambiar un tipo común a «Otro» sin descripción → 400; con descripción → ok', async () => {
      const { svc } = escenario();
      const t = await svc.crearTraumatico(10, { tipoId: 1 }, 5);
      await expect(svc.actualizarTraumatico(t.id, { tipoId: 2 }, 5)).rejects.toBeInstanceOf(BadRequestException);
      await expect(svc.actualizarTraumatico(t.id, { tipoId: 2, descripcion: 'Otra lesión' }, 5)).resolves.toMatchObject({
        tipo: { nombre: 'Otro' },
        descripcion: 'Otra lesión',
      });
    });

    it('PATCH: cambiar «Otro» a un tipo común ya no exige descripción', async () => {
      const { svc } = escenario();
      const t = await svc.crearTraumatico(10, { tipoId: 2, descripcion: 'x' }, 5);
      await expect(svc.actualizarTraumatico(t.id, { tipoId: 1, descripcion: null }, 5)).resolves.toMatchObject({ tipo: { nombre: 'Fractura' }, descripcion: null });
    });
  });

  describe('tipo del catálogo', () => {
    it('inexistente → 400; inactivo → 400 (al crear)', async () => {
      const { svc, traumaticos } = escenario();
      await expect(svc.crearTraumatico(10, { tipoId: 99 }, 5)).rejects.toMatchObject({ response: { errores: ['tipoId 99 no existe en el catálogo'] } });
      await expect(svc.crearTraumatico(10, { tipoId: 3 }, 5)).rejects.toMatchObject({ response: { errores: ['tipoId 3 ("Luxación") está desactivado'] } });
      expect(traumaticos()).toHaveLength(0);
    });

    it('PATCH: cambiar a un tipo inactivo → 400', async () => {
      const { svc } = escenario();
      const t = await svc.crearTraumatico(10, { tipoId: 1 }, 5);
      await expect(svc.actualizarTraumatico(t.id, { tipoId: 3 }, 5)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('PATCH: un tipo desactivado DESPUÉS de crear el registro no impide corregir sus otros campos', async () => {
      const { svc, db } = escenario();
      const t = await svc.crearTraumatico(10, { tipoId: 1 }, 5);
      db.filas(TipoAntecedenteTraumatico)[0].activo = false;
      await expect(svc.actualizarTraumatico(t.id, { localizacionAnatomica: 'Rodilla' }, 5)).resolves.toMatchObject({
        localizacionAnatomica: 'Rodilla',
        tipo: { nombre: 'Fractura', activo: false }, // se sigue resolviendo
      });
    });
  });

  describe('corregir (PATCH)', () => {
    it('edita solo los campos enviados, estampa modificadoPorId y respeta null para limpiar', async () => {
      const { svc } = escenario();
      const t = await svc.crearTraumatico(10, { tipoId: 1, descripcion: 'a', localizacionAnatomica: 'b', tiempoTranscurrido: 'c' }, 5);
      const r = await svc.actualizarTraumatico(t.id, { localizacionAnatomica: 'Rodilla', tiempoTranscurrido: null }, 9);
      expect(r).toMatchObject({ descripcion: 'a', localizacionAnatomica: 'Rodilla', tiempoTranscurrido: null, modificadoPorId: 9, creadoPorId: 5 });
    });

    it('el tipo no se puede vaciar con null (se ignora)', async () => {
      const { svc } = escenario();
      const t = await svc.crearTraumatico(10, { tipoId: 1 }, 5);
      await expect(svc.actualizarTraumatico(t.id, { tipoId: null as any }, 5)).resolves.toMatchObject({ tipoId: 1 });
    });

    it('descripción de más de 2000 caracteres: íntegra', async () => {
      const { svc } = escenario();
      const larga = 'Fractura conminuta con osteosíntesis y rehabilitación prolongada. '.repeat(60);
      expect(larga.length).toBeGreaterThan(2000);
      const t = await svc.crearTraumatico(10, { tipoId: 1, descripcion: larga }, 5);
      expect(t.descripcion).toBe(larga);
    });

    it('id inexistente → 404', async () => {
      const { svc } = escenario();
      await expect(svc.actualizarTraumatico(404, { descripcion: 'x' }, 5)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('un registro anulado no se edita (409)', async () => {
      const { svc } = escenario();
      const t = await svc.crearTraumatico(10, { tipoId: 1 }, 5);
      await svc.anularTraumatico(t.id, 'Duplicado', 5);
      await expect(svc.actualizarTraumatico(t.id, { descripcion: 'x' }, 5)).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('retirar (PATCH :id/anular, sin DELETE físico)', () => {
    it('anula con motivo, usuario y fecha; la fila SIGUE existiendo', async () => {
      const { svc, traumaticos } = escenario();
      const t = await svc.crearTraumatico(10, { tipoId: 1 }, 5);
      const r = await svc.anularTraumatico(t.id, 'Registrado dos veces', 9);
      expect(r).toMatchObject({ anulado: true, motivoAnulacion: 'Registrado dos veces', anuladoPorId: 9, modificadoPorId: 9 });
      expect(r.fechaAnulacion).toBeInstanceOf(Date);
      expect(traumaticos()).toHaveLength(1);
    });

    it('anular dos veces → 409', async () => {
      const { svc } = escenario();
      const t = await svc.crearTraumatico(10, { tipoId: 1 }, 5);
      await svc.anularTraumatico(t.id, 'x', 9);
      await expect(svc.anularTraumatico(t.id, 'otra vez', 9)).rejects.toBeInstanceOf(ConflictException);
    });

    it('anular uno no afecta a los demás (sin cascada)', async () => {
      const { svc, traumaticos } = escenario();
      const [a, b, c] = await dosFracturasYCirugia(svc);
      await svc.anularTraumatico(b.id, 'Error', 9);
      expect(traumaticos().map((f) => [f.id, f.anulado])).toEqual([[a.id, false], [b.id, true], [c.id, false]]);
    });

    it('id inexistente → 404', async () => {
      await expect(escenario().svc.anularTraumatico(404, 'x', 9)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('solo en borrador (409) y bloqueando la valoración', () => {
    it.each([EstadoValoracion.VIGENTE, EstadoValoracion.REEMPLAZADA])('con la valoración %s: crear, editar y anular → 409', async (estado) => {
      const { svc, db, valoracion } = escenario();
      const t = await svc.crearTraumatico(10, { tipoId: 1 }, 5); // se crea cuando aún es borrador
      valoracion.estado = estado; // …y luego se cierra
      await expect(svc.crearTraumatico(10, { tipoId: 1 }, 5)).rejects.toBeInstanceOf(ConflictException);
      await expect(svc.actualizarTraumatico(t.id, { descripcion: 'x' }, 5)).rejects.toBeInstanceOf(ConflictException);
      await expect(svc.anularTraumatico(t.id, 'x', 5)).rejects.toBeInstanceOf(ConflictException);
      expect(db.filas(AntecedenteTraumatico)[0]).toMatchObject({ anulado: false });
      expect(db.filas(AntecedenteTraumatico)).toHaveLength(1);
    });

    it('con la valoración anulada también → 409', async () => {
      const { svc, valoracion } = escenario();
      const t = await svc.crearTraumatico(10, { tipoId: 1 }, 5);
      valoracion.anulado = true;
      await expect(svc.crearTraumatico(10, { tipoId: 1 }, 5)).rejects.toBeInstanceOf(ConflictException);
      await expect(svc.anularTraumatico(t.id, 'x', 5)).rejects.toBeInstanceOf(ConflictException);
    });

    it('crear en una valoración inexistente → 404', async () => {
      await expect(escenario().svc.crearTraumatico(999, { tipoId: 1 }, 5)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('las rutas planas bloquean la VALORACIÓN del hijo (no solo el hijo) antes de escribir', async () => {
      const { svc, db } = escenario();
      const t = await svc.crearTraumatico(10, { tipoId: 1 }, 5);
      db.log.length = 0;
      await svc.actualizarTraumatico(t.id, { descripcion: 'x' }, 5);
      await svc.anularTraumatico(t.id, 'x', 5);
      expect(db.log.filter((e) => e === 'lock:ValoracionFisioterapeutica:10')).toHaveLength(2);
    });
  });

  it('no existe ninguna operación de borrado físico', () => {
    const metodos = Object.getOwnPropertyNames(AntecedentesValoracionService.prototype);
    expect(metodos.filter((m) => /elimin|delete|remove|borrar/i.test(m))).toEqual([]);
  });
});
