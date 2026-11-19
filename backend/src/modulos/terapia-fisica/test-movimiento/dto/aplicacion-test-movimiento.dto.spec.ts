import 'reflect-metadata';
import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';
import { generarTextoLargo } from 'src/common/testing/texto-largo.helper';
import { CrearAplicacionTestMovimientoDto } from './aplicacion-test-movimiento.dto';

// Misma configuración que el ValidationPipe global de main.ts.
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const cuerpo = (valor: unknown) => pipe.transform(valor, { type: 'body', metatype: CrearAplicacionTestMovimientoDto } as ArgumentMetadata);
const mensajes = async (valor: unknown): Promise<string[]> => {
  try {
    await cuerpo(valor);
    return [];
  } catch (e) {
    return ((e as BadRequestException).getResponse() as { message: string[] }).message;
  }
};
const ej = (ejercicioId: number, extra: object = {}) => ({ ejercicioId, modalidad: 'Con apoyo de bastón', resultado: 'Lo realiza', ...extra });

describe('CrearAplicacionTestMovimientoDto (RF-TF-10)', () => {
  it('acepta la aplicación mínima: modalidad y resultado por ejercicio; modificación y fecha opcionales', async () => {
    expect(await mensajes({ ejercicios: [ej(1), ej(2), ej(3)] })).toEqual([]);
  });

  it('acepta la aplicación completa y recorta los textos', async () => {
    const r = (await cuerpo({
      fecha: '2026-10-21',
      ejercicios: [ej(1, { modalidad: '  Asistido  ', modificacion: ' Silla alta ', resultado: ' Logrado ' }), ej(2, { modificacion: null })],
    })) as CrearAplicacionTestMovimientoDto;
    expect(r.fecha).toBe('2026-10-21');
    expect(r.ejercicios[0]).toMatchObject({ modalidad: 'Asistido', modificacion: 'Silla alta', resultado: 'Logrado' });
    expect(r.ejercicios[1].modificacion).toBeNull();
  });

  it('los valores de texto NO están restringidos a una lista (el instrumento no define escalas)', async () => {
    expect(await mensajes({ ejercicios: [ej(1, { modalidad: 'cualquier texto 123', resultado: 'otro texto libre' })] })).toEqual([]);
  });

  describe('ejercicios', () => {
    it('es obligatorio, debe ser un arreglo y tener al menos un elemento', async () => {
      expect((await mensajes({})).join()).toContain('ejercicios');
      expect((await mensajes({ ejercicios: [] })).join()).toContain('ejercicios must contain at least 1 elements');
      expect((await mensajes({ ejercicios: 'x' })).join()).toContain('ejercicios must be an array');
      expect((await mensajes({ ejercicios: null })).join()).toContain('ejercicios');
    });

    it('no admite el mismo ejercicioId repetido', async () => {
      expect(await mensajes({ ejercicios: [ej(1), ej(1)] })).toContain('ejercicios no admite el mismo ejercicioId repetido');
    });

    it('ejercicioId: entero ≥ 1', async () => {
      expect((await mensajes({ ejercicios: [ej(0)] })).join()).toContain('ejercicios.0.ejercicioId must not be less than 1');
      expect((await mensajes({ ejercicios: [ej(1.5)] })).join()).toContain('ejercicioId must be an integer number');
      expect((await mensajes({ ejercicios: [{ modalidad: 'x', resultado: 'y' }] })).join()).toContain('ejercicioId');
    });
  });

  describe('modalidad y resultado (obligatorios) / modificación (opcional)', () => {
    it.each(['modalidad', 'resultado'])('%s es obligatorio: ausente, vacío, en blanco o null ⇒ 400', async (campo) => {
      const sin = ej(1) as Record<string, unknown>;
      delete sin[campo];
      expect((await mensajes({ ejercicios: [sin] })).join()).toContain(campo);
      for (const v of ['', '   ', null]) {
        expect((await mensajes({ ejercicios: [ej(1, { [campo]: v })] })).join()).toContain(campo);
      }
    });

    it.each(['modalidad', 'modificacion', 'resultado'])('%s: máx. 255 caracteres', async (campo) => {
      expect(await mensajes({ ejercicios: [ej(1, { [campo]: 'x'.repeat(255) })] })).toEqual([]);
      expect((await mensajes({ ejercicios: [ej(1, { [campo]: 'x'.repeat(256) })] })).join()).toContain(
        `${campo} must be shorter than or equal to 255 characters`,
      );
    });

    it('rechaza lo que no es texto', async () => {
      expect((await mensajes({ ejercicios: [ej(1, { modalidad: 5 })] })).join()).toContain('modalidad must be a string');
    });

    it('un texto largo se rechaza por el tope de 255 (son campos cortos, ERD varchar)', async () => {
      expect((await mensajes({ ejercicios: [ej(1, { resultado: generarTextoLargo(2500) })] })).join()).toContain('resultado');
    });

    it('rechaza propiedades desconocidas dentro de un ejercicio', async () => {
      expect((await mensajes({ ejercicios: [ej(1, { puntaje: 3 })] })).join()).toContain('property puntaje should not exist');
    });
  });

  describe('fecha y lo que el cliente no puede enviar', () => {
    it.each(['21/10/2026', '2026-1-1', '2026-10-21T10:00', 'hoy'])('rechaza la fecha %p', async (fecha) => {
      expect(await mensajes({ fecha, ejercicios: [ej(1)] })).toContain('fecha debe tener formato YYYY-MM-DD');
    });

    it.each(['expedienteId', 'usuarioResponsableId', 'anulado', 'motivoAnulacion', 'anuladoPorId', 'creadoPorId', 'fechaCreacion', 'id'])(
      'rechaza %s con 400 (whitelist)',
      async (campo) => {
        expect((await mensajes({ [campo]: 1, ejercicios: [ej(1)] })).join()).toContain(`property ${campo} should not exist`);
      },
    );
  });
});
