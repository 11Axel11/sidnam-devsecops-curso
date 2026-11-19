/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- resultados del pipe sin tipar */
import 'reflect-metadata';
import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';
import {
  ActualizarAntecedenteTraumaticoDto,
  CrearAntecedenteTraumaticoDto,
  RegistrarAntecedentesPersonalesDto,
} from './antecedentes.dto';

// Misma configuración que el ValidationPipe global de main.ts.
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const body = (metatype: new () => object): ArgumentMetadata => ({ type: 'body', metatype });
const personales = (b: object) => pipe.transform(b, body(RegistrarAntecedentesPersonalesDto));
const crearTr = (b: object) => pipe.transform(b, body(CrearAntecedenteTraumaticoDto));
const actualizarTr = (b: object) => pipe.transform(b, body(ActualizarAntecedenteTraumaticoDto));

describe('DTOs de antecedentes de la valoración', () => {
  describe('personales: { antecedentes: [...] } (upsert)', () => {
    it('el ejemplo de la tarea B.1.4 es válido', async () => {
      const r: any = await personales({
        antecedentes: [
          { antecedenteId: 1, presente: true, observacion: 'Diagnosticada en 2019' },
          { antecedenteId: 2, presente: false, observacion: null },
        ],
      });
      expect(r.antecedentes).toHaveLength(2);
      expect(r.antecedentes[1].observacion).toBeNull();
    });

    it.each([17, 25, 120])('acepta cualquier cantidad de ítems (%s), sin asumir un número fijo', async (n) => {
      const antecedentes = Array.from({ length: n }, (_, i) => ({ antecedenteId: i + 1, presente: i % 2 === 0 }));
      const r: any = await personales({ antecedentes });
      expect(r.antecedentes).toHaveLength(n);
    });

    it('el elemento es una instancia validada (observación recortada; vacía → null)', async () => {
      const r: any = await personales({
        antecedentes: [
          { antecedenteId: 1, presente: true, observacion: '  desde 2019  ' },
          { antecedenteId: 2, presente: false, observacion: '   ' },
          { antecedenteId: 3, presente: false },
        ],
      });
      expect(r.antecedentes[0].observacion).toBe('desde 2019');
      expect(r.antecedentes[1].observacion).toBeNull();
      expect(r.antecedentes[2].observacion).toBeUndefined();
    });

    it.each([
      [{}],
      [{ antecedentes: [] }],
      [{ antecedentes: 'x' }],
      [{ antecedentes: [{ presente: true }] }],
      [{ antecedentes: [{ antecedenteId: 1 }] }],
      [{ antecedentes: [{ antecedenteId: 0, presente: true }] }],
      [{ antecedentes: [{ antecedenteId: 1.5, presente: true }] }],
      [{ antecedentes: [{ antecedenteId: '1', presente: true }] }],
      [{ antecedentes: [{ antecedenteId: 1, presente: 'true' }] }],
      [{ antecedentes: [{ antecedenteId: 1, presente: 'false' }] }],
    ])('rechaza %j', async (b) => {
      await expect(personales(b)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza el mismo antecedenteId repetido en un envío', async () => {
      await expect(
        personales({ antecedentes: [{ antecedenteId: 1, presente: true }, { antecedenteId: 1, presente: false }] }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it.each([['creadoPorId'], ['valoracionId'], ['id'], ['anulado']])(
      'rechaza %s dentro de un ítem (lo decide el servidor)',
      async (campo) => {
        await expect(
          personales({ antecedentes: [{ antecedenteId: 1, presente: true, [campo]: 1 }] }),
        ).rejects.toBeInstanceOf(BadRequestException);
      },
    );

    it('observación de más de 2000 caracteres: se conserva íntegra; de >20000 → 400', async () => {
      const larga = 'Antecedente con observación extensa ñ. '.repeat(100);
      expect(larga.length).toBeGreaterThan(2000);
      const r: any = await personales({ antecedentes: [{ antecedenteId: 1, presente: true, observacion: larga }] });
      expect(r.antecedentes[0].observacion).toBe(larga.trim());
      await expect(
        personales({ antecedentes: [{ antecedenteId: 1, presente: true, observacion: 'x'.repeat(20001) }] }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('traumático: registro independiente', () => {
    it('solo tipoId es obligatorio', async () => {
      await expect(crearTr({ tipoId: 1 })).resolves.toBeDefined();
      await expect(crearTr({})).rejects.toBeInstanceOf(BadRequestException);
    });

    it('cuerpo completo válido', async () => {
      const r: any = await crearTr({
        tipoId: 2,
        descripcion: 'Fractura de cadera',
        localizacionAnatomica: 'Cadera derecha',
        tiempoTranscurrido: 'Hace 3 años',
      });
      expect(r).toMatchObject({ tipoId: 2, localizacionAnatomica: 'Cadera derecha' });
    });

    it.each([[0], [-1], [1.5], ['1'], [null]])('tipoId inválido %j → 400', async (tipoId) => {
      await expect(crearTr({ tipoId })).rejects.toBeInstanceOf(BadRequestException);
    });

    it.each([['creadoPorId'], ['valoracionId'], ['anulado'], ['motivoAnulacion'], ['anuladoPorId'], ['id']])(
      'rechaza %s en el body',
      async (campo) => {
        await expect(crearTr({ tipoId: 1, [campo]: 1 })).rejects.toBeInstanceOf(BadRequestException);
      },
    );

    it('textos: recorta, vacío → null, descripción larga íntegra, campos cortos tope 255', async () => {
      const larga = 'Caída con fractura multifragmentaria ñ. '.repeat(120);
      const r: any = await crearTr({ tipoId: 1, descripcion: larga, localizacionAnatomica: '  ', tiempoTranscurrido: ' 2 años ' });
      expect(r.descripcion).toBe(larga.trim());
      expect(r.localizacionAnatomica).toBeNull();
      expect(r.tiempoTranscurrido).toBe('2 años');
      await expect(crearTr({ tipoId: 1, localizacionAnatomica: 'x'.repeat(256) })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('PATCH: parcial; permite null para limpiar; no admite estado de anulación', async () => {
      await expect(actualizarTr({})).resolves.toBeDefined();
      const r: any = await actualizarTr({ descripcion: null, tiempoTranscurrido: '1 año' });
      expect(r.descripcion).toBeNull();
      await expect(actualizarTr({ anulado: true })).rejects.toBeInstanceOf(BadRequestException);
      await expect(actualizarTr({ tipoId: 0 })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('PATCH: tipoId null → 400 (el tipo no se puede vaciar); omitido o válido sí pasa', async () => {
      await expect(actualizarTr({ tipoId: null })).rejects.toBeInstanceOf(BadRequestException);
      await expect(actualizarTr({ tipoId: null, descripcion: 'x' })).rejects.toBeInstanceOf(BadRequestException);
      await expect(actualizarTr({ descripcion: 'x' })).resolves.toBeDefined();
      await expect(actualizarTr({ tipoId: 3 })).resolves.toMatchObject({ tipoId: 3 });
    });
  });
});
