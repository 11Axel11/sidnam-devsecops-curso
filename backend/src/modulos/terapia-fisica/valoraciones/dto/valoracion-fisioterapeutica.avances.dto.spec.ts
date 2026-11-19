/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- resultados del pipe sin tipar */
import 'reflect-metadata';
import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';
import { ActualizarValoracionFisioterapeuticaDto, CrearValoracionFisioterapeuticaDto } from './valoracion-fisioterapeutica.dto';

/**
 * `avances` (RF-TF-12, decisión de la Jefatura, octubre 2026): texto abierto OPCIONAL, mismo decorador de texto
 * largo que `diagnosticoDiferencial` y `tratamiento` (`@TextoLibre`: recorta, vacío → null, máx. 20 000).
 */
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const body = (metatype: new () => object): ArgumentMetadata => ({ type: 'body', metatype });
const crear = (b: object): Promise<any> => pipe.transform(b, body(CrearValoracionFisioterapeuticaDto));
const actualizar = (b: object): Promise<any> => pipe.transform(b, body(ActualizarValoracionFisioterapeuticaDto));

describe.each([
  ['POST', crear],
  ['PATCH', actualizar],
])('avances en el DTO %s', (_nombre, validar) => {
  it('es opcional: sin el campo es válido y no aparece', async () => {
    expect((await validar({})).avances).toBeUndefined();
  });

  it('acepta un texto y lo conserva (recortado)', async () => {
    expect((await validar({ avances: '  Mejoró la marcha con andadera.  ' })).avances).toBe('Mejoró la marcha con andadera.');
  });

  it('null se conserva (en PATCH limpia el campo)', async () => {
    expect((await validar({ avances: null })).avances).toBeNull();
  });

  it('vacío o en blanco → null', async () => {
    expect((await validar({ avances: '' })).avances).toBeNull();
    expect((await validar({ avances: '   ' })).avances).toBeNull();
  });

  it('acepta más de 2000 caracteres, intacto (sin truncar ni fragmentar)', async () => {
    const largo = 'Avance documentado en la sesión con evolución favorable ñ. '.repeat(60);
    expect(largo.length).toBeGreaterThan(2000);
    const r = await validar({ avances: largo });
    expect(r.avances).toBe(largo.trim());
    expect(r.avances.length).toBeGreaterThan(2000);
  });

  it('exactamente 20 000 caracteres es válido; 20 001 ⇒ 400', async () => {
    await expect(validar({ avances: 'x'.repeat(20000) })).resolves.toBeDefined();
    await expect(validar({ avances: 'x'.repeat(20001) })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('un valor que no es texto ⇒ 400 (`avances must be a string`)', async () => {
    for (const valor of [123, true, ['a'], { a: 1 }]) {
      const e = await validar({ avances: valor }).then(
        () => undefined,
        (x: unknown) => x as BadRequestException,
      );
      expect(e).toBeInstanceOf(BadRequestException);
      expect((e!.getResponse() as { message: string[] }).message).toContain('avances must be a string');
    }
  });
});

describe('avances junto a los demás campos', () => {
  it('conviven con diagnosticoDiferencial y tratamiento en el mismo cuerpo', async () => {
    const r = await crear({ diagnosticoDiferencial: 'Gonartrosis', tratamiento: 'Fortalecimiento', avances: 'Mayor arco de movimiento' });
    expect(r).toMatchObject({ diagnosticoDiferencial: 'Gonartrosis', tratamiento: 'Fortalecimiento', avances: 'Mayor arco de movimiento' });
  });
});
