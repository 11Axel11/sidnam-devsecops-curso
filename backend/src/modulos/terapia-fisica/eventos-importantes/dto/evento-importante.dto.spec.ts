import 'reflect-metadata';
import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';
import { generarTextoLargo } from 'src/common/testing/texto-largo.helper';
import { MAX_TEXTO_LIBRE } from 'src/common/validators/texto-libre.decorator';
import { CrearEventoImportanteDto, ListarEventosImportantesDto } from './evento-importante.dto';

// Misma configuración que el ValidationPipe global de main.ts.
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const cuerpo = (valor: unknown) => pipe.transform(valor, { type: 'body', metatype: CrearEventoImportanteDto } as ArgumentMetadata);
const consulta = (valor: unknown) => pipe.transform(valor, { type: 'query', metatype: ListarEventosImportantesDto } as ArgumentMetadata);
const mensajes = async (promesa: Promise<unknown>): Promise<string[]> => {
  try {
    await promesa;
    return [];
  } catch (e) {
    return ((e as BadRequestException).getResponse() as { message: string[] }).message;
  }
};
const base = { tipoEventoId: 1 };

describe('CrearEventoImportanteDto', () => {
  it('solo tipoEventoId es obligatorio (la fecha-hora es ahora y la descripción opcional)', async () => {
    expect(await mensajes(cuerpo(base))).toEqual([]);
    expect((await mensajes(cuerpo({}))).join()).toContain('tipoEventoId');
  });

  it('acepta el evento completo', async () => {
    const completo = { fechaHora: '2026-10-21T14:30', tipoEventoId: 1, descripcion: 'Caída en el baño, sin fractura' };
    expect(await cuerpo(completo)).toEqual(completo);
  });

  it.each(['2026-10-21T14:30', '2026-10-21T14:30:15', '2026-10-21T14:30:15.123', '2026-10-21T14:30:00Z', '2026-10-21T14:30:00-06:00', '2026-10-21T14:30+01:00'])(
    'acepta la fecha-hora %p',
    async (fechaHora) => {
      expect(await mensajes(cuerpo({ ...base, fechaHora }))).toEqual([]);
    },
  );

  it.each(['21/10/2026 14:30', '2026-10-21', '2026-10-21 14:30', 'ayer', '2026-10-21T14', '2026-10-21T14:30:00 -06:00'])(
    'rechaza la fecha-hora %p',
    async (fechaHora) => {
      expect(await mensajes(cuerpo({ ...base, fechaHora }))).toContain(
        'fechaHora debe ser una fecha y hora ISO 8601 (por ejemplo 2026-10-21T14:30)',
      );
    },
  );

  it('tipoEventoId: entero ≥ 1', async () => {
    expect((await mensajes(cuerpo({ tipoEventoId: 0 }))).join()).toContain('tipoEventoId must not be less than 1');
    expect((await mensajes(cuerpo({ tipoEventoId: 1.5 }))).join()).toContain('tipoEventoId must be an integer number');
    expect((await mensajes(cuerpo({ tipoEventoId: '1' }))).join()).toContain('tipoEventoId must be an integer number');
    expect((await mensajes(cuerpo({ tipoEventoId: null }))).join()).toContain('tipoEventoId');
  });

  it.each(['expedienteId', 'anulado', 'motivoAnulacion', 'anuladoPorId', 'fechaAnulacion', 'creadoPorId', 'fechaCreacion', 'usuarioResponsableId', 'id'])(
    'rechaza %s con 400 (whitelist)',
    async (campo) => {
      expect((await mensajes(cuerpo({ ...base, [campo]: 1 }))).join()).toContain(`property ${campo} should not exist`);
    },
  );

  describe('descripcion (texto libre)', () => {
    it('se recorta y el vacío se convierte en null; null y ausente son válidos', async () => {
      expect(((await cuerpo({ ...base, descripcion: '  Cayó  ' })) as CrearEventoImportanteDto).descripcion).toBe('Cayó');
      expect(((await cuerpo({ ...base, descripcion: '   ' })) as CrearEventoImportanteDto).descripcion).toBeNull();
      expect(await mensajes(cuerpo({ ...base, descripcion: null }))).toEqual([]);
    });

    it('admite texto largo (> 2000 caracteres, CA-06) hasta el máximo y rechaza el exceso', async () => {
      expect(await mensajes(cuerpo({ ...base, descripcion: generarTextoLargo(2500) }))).toEqual([]);
      expect(await mensajes(cuerpo({ ...base, descripcion: generarTextoLargo(MAX_TEXTO_LIBRE) }))).toEqual([]);
      expect((await mensajes(cuerpo({ ...base, descripcion: generarTextoLargo(MAX_TEXTO_LIBRE + 1) }))).join()).toContain(
        'descripcion must be shorter than or equal to',
      );
    });

    it('rechaza lo que no es texto', async () => {
      expect((await mensajes(cuerpo({ ...base, descripcion: 123 }))).join()).toContain('descripcion must be a string');
    });
  });
});

describe('ListarEventosImportantesDto (query)', () => {
  it('todo opcional; convierte tipoEventoId e incluirAnulados desde el texto del query string', async () => {
    expect(await consulta({})).toEqual({});
    expect(await consulta({ desde: '2026-01-01', hasta: '2026-12-31', tipoEventoId: '3', incluirAnulados: 'true' })).toEqual({
      desde: '2026-01-01',
      hasta: '2026-12-31',
      tipoEventoId: 3,
      incluirAnulados: true,
    });
  });

  it('rechaza tipoEventoId inválido, fechas mal formadas y parámetros desconocidos', async () => {
    expect((await mensajes(consulta({ tipoEventoId: 'x' }))).join()).toContain('tipoEventoId must be an integer number');
    expect((await mensajes(consulta({ tipoEventoId: '0' }))).join()).toContain('tipoEventoId must not be less than 1');
    expect(await mensajes(consulta({ desde: '01/01/2026' }))).toContain('desde debe tener formato YYYY-MM-DD');
    expect((await mensajes(consulta({ tipo: 1 }))).join()).toContain('property tipo should not exist');
  });
});
