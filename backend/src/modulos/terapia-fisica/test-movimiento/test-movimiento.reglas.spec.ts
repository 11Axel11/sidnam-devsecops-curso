import { EjercicioCatalogo, erroresDeEjercicios } from './test-movimiento.reglas';

const catalogo: EjercicioCatalogo[] = [
  { id: 1, nombre: 'Transferencias de sedente a bípedo', activo: true },
  { id: 2, nombre: 'Flexiones de hombro', activo: true },
  { id: 3, nombre: 'Velocidad en marcha', activo: true },
];

describe('erroresDeEjercicios (RF-TF-10: un elemento por cada ejercicio ACTIVO del catálogo)', () => {
  it('exactamente los activos (en cualquier orden): sin errores', () => {
    expect(erroresDeEjercicios([1, 2, 3], catalogo)).toEqual([]);
    expect(erroresDeEjercicios([3, 1, 2], catalogo)).toEqual([]);
  });

  it('un ejercicio activo que falta se reclama por id y nombre', () => {
    expect(erroresDeEjercicios([1, 2], catalogo)).toEqual([
      'falta el ejercicioId 3 ("Velocidad en marcha"): la aplicación debe incluir todos los ejercicios activos',
    ]);
  });

  it('no se envió ninguno: se reclaman todos, en el orden del catálogo', () => {
    const e = erroresDeEjercicios([], catalogo);
    expect(e).toHaveLength(3);
    expect(e[0]).toContain('ejercicioId 1');
    expect(e[2]).toContain('ejercicioId 3');
  });

  it('un ejercicio inexistente se rechaza', () => {
    expect(erroresDeEjercicios([1, 2, 3, 99], catalogo)).toEqual(['ejercicioId 99 no existe en el catálogo']);
  });

  it('un ejercicio desactivado se rechaza y NO se exige', () => {
    const conInactivo = [...catalogo, { id: 4, nombre: 'Equilibrio', activo: false }];
    expect(erroresDeEjercicios([1, 2, 3], conInactivo)).toEqual([]); // el inactivo no se exige
    expect(erroresDeEjercicios([1, 2, 3, 4], conInactivo)).toEqual(['ejercicioId 4 ("Equilibrio") está desactivado']);
  });

  it('un ejercicio agregado al catálogo (activo) pasa a ser obligatorio sin cambiar el código', () => {
    const ampliado = [...catalogo, { id: 4, nombre: 'Equilibrio estático', activo: true }];
    expect(erroresDeEjercicios([1, 2, 3], ampliado)).toEqual([
      'falta el ejercicioId 4 ("Equilibrio estático"): la aplicación debe incluir todos los ejercicios activos',
    ]);
    expect(erroresDeEjercicios([1, 2, 3, 4], ampliado)).toEqual([]);
  });

  it('un ejercicio repetido se rechaza (defensa; el DTO ya lo impide)', () => {
    expect(erroresDeEjercicios([1, 1, 2, 3], catalogo)).toEqual(['ejercicioId 1 está repetido']);
  });

  it('junta TODOS los problemas: primero lo enviado (en orden), luego lo que falta', () => {
    const e = erroresDeEjercicios([99, 2], catalogo);
    expect(e).toEqual([
      'ejercicioId 99 no existe en el catálogo',
      'falta el ejercicioId 1 ("Transferencias de sedente a bípedo"): la aplicación debe incluir todos los ejercicios activos',
      'falta el ejercicioId 3 ("Velocidad en marcha"): la aplicación debe incluir todos los ejercicios activos',
    ]);
  });

  it('catálogo sin ejercicios activos: nada que exigir, pero todo lo enviado se rechaza', () => {
    const inactivo = [{ id: 1, nombre: 'Viejo', activo: false }];
    expect(erroresDeEjercicios([], inactivo)).toEqual([]);
    expect(erroresDeEjercicios([1], inactivo)).toHaveLength(1);
  });
});
