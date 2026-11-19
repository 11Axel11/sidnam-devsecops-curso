import { ModulosOpts, SeccionesBloqueB } from './rol.enum';

describe('catálogo de permisos (ModulosOpts)', () => {
  it('las secciones del Bloque B existen, con la grafía exacta SIN tildes', () => {
    const pares = ModulosOpts.map((m) => `${m.modulo}.${m.seccion}`);
    expect(pares).toEqual(
      expect.arrayContaining(['Nutricion.Nutricion', 'TerapiaFisica.TerapiaFisica', 'FichaResumen.FichaResumen', 'Catalogos.Catalogos']),
    );
    for (const s of Object.values(SeccionesBloqueB)) {
      expect(ModulosOpts.some((m) => m.seccion === s)).toBe(true);
      expect(s).toMatch(/^[A-Za-z]+$/); // sin tildes, espacios ni ñ
    }
  });

  it('el nombre de sección es único: SeccionGuard compara solo por sección, no por módulo', () => {
    const secciones = ModulosOpts.map((m) => m.seccion);
    expect(new Set(secciones).size).toBe(secciones.length);
  });

  it('no se tocó ninguna sección existente (siguen las 18 originales con su grafía)', () => {
    const originales = ModulosOpts.filter((m) => m.id <= 18).map((m) => m.seccion);
    expect(originales).toHaveLength(18);
    expect(originales).toEqual(expect.arrayContaining(['Enfermería', 'Gestión Donaciones', 'Facturas Proveduría', 'Galeria']));
  });
});
