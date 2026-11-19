import { ControlNutricional } from '../entities/control-nutricional.entity';
import { armarSerie } from './control-nutricional.lectura';

const control = (id: number, fecha: string, peso: number, imc: number, anulado = false): ControlNutricional =>
  ({ id, expedienteId: 1, fecha, peso, imc, anulado, talla: 152, edadMomentoControl: 86 }) as ControlNutricional;

describe('armarSerie (respuesta de GET …/controles-nutricionales)', () => {
  const todos = [
    control(1, '2026-01-10', 60.1, 26),
    control(2, '2026-04-10', 58.4, 25.3),
    control(3, '2026-07-10', 59, 25.6),
    control(4, '2026-10-10', 57, 24.7),
  ];

  it('devuelve del más reciente al más antiguo, cada fila con su variación respecto del anterior', () => {
    const r = armarSerie(todos, { incluirAnulados: false });
    expect(r.map((c) => c.id)).toEqual([4, 3, 2, 1]);
    expect(r.map((c) => c.variacionPeso)).toEqual([-2, 0.6, -1.7, null]);
    expect(r.map((c) => c.variacionImc)).toEqual([-0.9, 0.3, -0.7, null]);
  });

  it('conserva los datos almacenados tal cual (no recalcula imc ni edad)', () => {
    const r = armarSerie([{ ...control(1, '2026-01-10', 60, 99.9), edadMomentoControl: 12 } as ControlNutricional], { incluirAnulados: false });
    expect(r[0]).toMatchObject({ imc: 99.9, edadMomentoControl: 12 });
  });

  it('excluye los anulados por defecto; con incluirAnulados los trae marcados y sin variación', () => {
    const conAnulado = [...todos, control(5, '2026-11-01', 80, 34.6, true)];
    expect(armarSerie(conAnulado, { incluirAnulados: false }).map((c) => c.id)).toEqual([4, 3, 2, 1]);
    const r = armarSerie(conAnulado, { incluirAnulados: true });
    expect(r.map((c) => c.id)).toEqual([5, 4, 3, 2, 1]);
    expect(r[0]).toMatchObject({ anulado: true, variacionPeso: null, variacionImc: null });
  });

  it('desde y hasta son inclusivos', () => {
    const r = armarSerie(todos, { desde: '2026-04-10', hasta: '2026-07-10', incluirAnulados: false });
    expect(r.map((c) => c.id)).toEqual([3, 2]);
  });

  it('la primera fila del rango se compara con el control previo REAL, aunque quede fuera del rango', () => {
    const r = armarSerie(todos, { desde: '2026-07-10', incluirAnulados: false });
    expect(r.map((c) => c.id)).toEqual([4, 3]);
    expect(r.find((c) => c.id === 3)?.variacionPeso).toBe(0.6); // contra el 2 (fuera del rango)
  });

  it('rango sin controles ⇒ lista vacía', () => {
    expect(armarSerie(todos, { desde: '2027-01-01', incluirAnulados: false })).toEqual([]);
  });

  it('mismo día: el último registrado primero', () => {
    const r = armarSerie([control(7, '2026-05-01', 60, 26), control(8, '2026-05-01', 61, 26.4)], { incluirAnulados: false });
    expect(r.map((c) => c.id)).toEqual([8, 7]);
  });

  it('no modifica los controles recibidos', () => {
    const copia = todos.map((c) => ({ ...c }));
    armarSerie(todos, { incluirAnulados: true });
    expect(todos).toEqual(copia);
  });
});
