import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { MAX_PROFESIONAL_CODIGO, MAX_PROFESIONAL_NOMBRE, ReporteSemestralQueryDto } from './reporte-semestral.dto';

const validar = (q: Record<string, unknown>) => {
  const dto = plainToInstance(ReporteSemestralQueryDto, q);
  return { dto, errores: validateSync(dto).flatMap((e) => Object.keys(e.constraints ?? {}).map((c) => `${e.property}:${c}`)) };
};

describe('ReporteSemestralQueryDto', () => {
  it('anio y semestre llegan como texto de la query y se convierten', () => {
    const { dto, errores } = validar({ anio: '2026', semestre: '2' });
    expect(errores).toEqual([]);
    expect(dto).toMatchObject({ anio: 2026, semestre: 2 });
  });

  it.each([
    [{ semestre: '1' }, 'anio'],
    [{ anio: 'abc', semestre: '1' }, 'anio'],
    [{ anio: '2026.5', semestre: '1' }, 'anio'],
    [{ anio: '1999', semestre: '1' }, 'anio'],
    [{ anio: '2101', semestre: '1' }, 'anio'],
    [{ anio: '2026' }, 'semestre'],
    [{ anio: '2026', semestre: '0' }, 'semestre'],
    [{ anio: '2026', semestre: '3' }, 'semestre'],
    [{ anio: '2026', semestre: 'uno' }, 'semestre'],
  ])('parámetros inválidos %j ⇒ error en %s', (q, campo) => {
    expect(validar(q).errores.some((e) => e.startsWith(`${campo}:`))).toBe(true);
  });

  it('los parámetros del profesional son opcionales (ausentes o vacíos ⇒ ok y undefined)', () => {
    expect(validar({ anio: '2026', semestre: '1' }).errores).toEqual([]);
    const { dto, errores } = validar({ anio: '2026', semestre: '1', profesionalNombre: '   ', profesionalCodigo: '' });
    expect(errores).toEqual([]);
    expect(dto.profesionalNombre).toBeUndefined();
    expect(dto.profesionalCodigo).toBeUndefined();
  });

  it('el nombre se imprime tal como se digita (con su título), solo recortado y sin espacios dobles', () => {
    const { dto, errores } = validar({ anio: '2026', semestre: '1', profesionalNombre: '  Lic.   Ana  María Mora  ', profesionalCodigo: 'CFT-12345' });
    expect(errores).toEqual([]);
    expect(dto.profesionalNombre).toBe('Lic. Ana María Mora');
    expect(dto.profesionalCodigo).toBe('CFT-12345');
  });

  it.each(['<script>alert(1)</script>', 'Ana <b>Mora</b>', 'Ana & Mora', 'Ana "Mora"', 'Ana;DROP', 'Ana`Mora`'])('texto con HTML o símbolos peligrosos %j ⇒ rechazado', (nombre) => {
    expect(validar({ anio: '2026', semestre: '1', profesionalNombre: nombre }).errores.some((e) => e.startsWith('profesionalNombre:'))).toBe(true);
    expect(validar({ anio: '2026', semestre: '1', profesionalCodigo: nombre }).errores.some((e) => e.startsWith('profesionalCodigo:'))).toBe(true);
  });

  it('los caracteres de control se eliminan antes de validar', () => {
    const { dto, errores } = validar({ anio: '2026', semestre: '1', profesionalNombre: 'Ana\u0000\nMora' });
    expect(errores).toEqual([]);
    expect(dto.profesionalNombre).toBe('Ana Mora');
  });

  it('longitud máxima', () => {
    expect(validar({ anio: '2026', semestre: '1', profesionalNombre: 'a'.repeat(MAX_PROFESIONAL_NOMBRE) }).errores).toEqual([]);
    expect(validar({ anio: '2026', semestre: '1', profesionalNombre: 'a'.repeat(MAX_PROFESIONAL_NOMBRE + 1) }).errores).toContain('profesionalNombre:maxLength');
    expect(validar({ anio: '2026', semestre: '1', profesionalCodigo: 'a'.repeat(MAX_PROFESIONAL_CODIGO + 1) }).errores).toContain('profesionalCodigo:maxLength');
  });
});
