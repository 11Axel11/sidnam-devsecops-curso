/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- respuestas JSON sin tipar */
import { StreamableFile } from '@nestjs/common';
import { Readable } from 'stream';
import { conNombresDeUsuario, esRespuestaDeDatos, recolectarIdsDeUsuario } from './nombres-de-usuario';

/** Mapeo aditivo de ids de usuario a nombres (CA-26): puro, sin base de datos. */
const NOMBRES = new Map<number, string | null>([
  [5, 'Karina Mora Díaz'],
  [6, 'Elena Rojas'],
  [7, null],
]);

describe('conNombresDeUsuario — campos de usuario', () => {
  it('agrega los CINCO nombres junto a su id', () => {
    const r = conNombresDeUsuario(
      { id: 1, creadoPorId: 5, modificadoPorId: 6, anuladoPorId: 5, usuarioResponsableId: 6, usuarioExaminadorId: 5 },
      NOMBRES,
    );
    expect(r).toEqual({
      id: 1,
      creadoPorId: 5, creadoPorNombre: 'Karina Mora Díaz',
      modificadoPorId: 6, modificadoPorNombre: 'Elena Rojas',
      anuladoPorId: 5, anuladoPorNombre: 'Karina Mora Díaz',
      usuarioResponsableId: 6, usuarioResponsableNombre: 'Elena Rojas',
      usuarioExaminadorId: 5, usuarioExaminadorNombre: 'Karina Mora Díaz',
    });
  });

  it('CONSERVA todos los campos de siempre y su orden; el nombre queda justo después de su id', () => {
    const original = { id: 1, fecha: '2026-10-21', creadoPorId: 5, fechaCreacion: new Date('2026-10-21T10:00:00Z'), modificadoPorId: null, total: 45 };
    const r = conNombresDeUsuario(original, NOMBRES) as Record<string, unknown>;
    expect(Object.keys(r)).toEqual(['id', 'fecha', 'creadoPorId', 'creadoPorNombre', 'fechaCreacion', 'modificadoPorId', 'modificadoPorNombre', 'total']);
    for (const [k, v] of Object.entries(original)) expect(r[k]).toEqual(v);
  });

  it('id null ⇒ nombre null; id sin usuario resoluble ⇒ null; usuario sin nombre ⇒ null (la clave siempre está)', () => {
    const r = conNombresDeUsuario({ creadoPorId: null, modificadoPorId: 999, anuladoPorId: 7 }, NOMBRES);
    expect(r).toEqual({ creadoPorId: null, creadoPorNombre: null, modificadoPorId: 999, modificadoPorNombre: null, anuladoPorId: 7, anuladoPorNombre: null });
  });

  it('un objeto sin ids de usuario queda igual (mismo contenido)', () => {
    const original = { id: 1, nombre: 'x', anidado: { a: [1, 2] } };
    expect(conNombresDeUsuario(original, NOMBRES)).toEqual(original);
  });

  it('si el objeto ya trae el nombre, no lo duplica ni lo pisa', () => {
    expect(conNombresDeUsuario({ creadoPorId: 5, creadoPorNombre: 'Ya viene' }, NOMBRES)).toEqual({ creadoPorId: 5, creadoPorNombre: 'Ya viene' });
  });

  it('NO muta la entrada', () => {
    const original = { creadoPorId: 5, hijos: [{ modificadoPorId: 6 }] };
    const copia = JSON.parse(JSON.stringify(original));
    conNombresDeUsuario(original, NOMBRES);
    expect(original).toEqual(copia);
  });
});

describe('conNombresDeUsuario — estructuras', () => {
  it('recorre arreglos (listados) y objetos anidados (hijos de una valoración, ejercicios del test)', () => {
    const r = conNombresDeUsuario(
      [
        { id: 1, creadoPorId: 5, antecedentesPersonales: [{ id: 10, creadoPorId: 6, modificadoPorId: null }], antecedentesTraumaticos: [{ id: 20, anuladoPorId: 5 }] },
        { id: 2, creadoPorId: 6 },
      ],
      NOMBRES,
    ) as Record<string, any>[];
    expect(r[0].creadoPorNombre).toBe('Karina Mora Díaz');
    expect(r[0].antecedentesPersonales[0]).toMatchObject({ creadoPorNombre: 'Elena Rojas', modificadoPorNombre: null });
    expect(r[0].antecedentesTraumaticos[0].anuladoPorNombre).toBe('Karina Mora Díaz');
    expect(r[1].creadoPorNombre).toBe('Elena Rojas');
  });

  it('las fechas (Date) pasan intactas, con la misma instancia', () => {
    const fecha = new Date('2026-10-21T10:00:00Z');
    const r = conNombresDeUsuario({ creadoPorId: 5, fechaCreacion: fecha }, NOMBRES) as { fechaCreacion: Date };
    expect(r.fechaCreacion).toBe(fecha);
  });

  it('una instancia de clase (entidad) sale como objeto plano con los mismos datos que se serializarían', () => {
    class Entidad {
      id = 1;
      creadoPorId: number | null = 5;
      fecha = '2026-10-21';
    }
    const e = new Entidad();
    const r = conNombresDeUsuario(e, NOMBRES);
    expect(JSON.parse(JSON.stringify(r))).toEqual({ ...JSON.parse(JSON.stringify(e)), creadoPorNombre: 'Karina Mora Díaz' });
  });

  it('el mismo objeto referenciado dos veces (no es un ciclo) se enriquece en ambos lugares', () => {
    const compartido = { creadoPorId: 5 };
    const r = conNombresDeUsuario({ a: compartido, b: compartido }, NOMBRES) as Record<string, any>;
    expect(r.a.creadoPorNombre).toBe('Karina Mora Díaz');
    expect(r.b.creadoPorNombre).toBe('Karina Mora Díaz');
  });

  it('un ciclo no provoca recursión infinita', () => {
    const a: Record<string, unknown> = { creadoPorId: 5 };
    a.yo = a;
    expect(() => conNombresDeUsuario(a, NOMBRES)).not.toThrow();
    expect(() => recolectarIdsDeUsuario(a)).not.toThrow();
  });
});

describe('recolectarIdsDeUsuario', () => {
  it('junta los ids de cualquier nivel, sin repetir y sin los null', () => {
    const ids = recolectarIdsDeUsuario([
      { creadoPorId: 5, modificadoPorId: null, hijos: [{ creadoPorId: 5, anuladoPorId: 6 }] },
      { usuarioResponsableId: 7, usuarioExaminadorId: 5 },
    ]);
    expect([...ids].sort()).toEqual([5, 6, 7]);
  });

  it('respuestas sin ids ⇒ vacío', () => {
    expect(recolectarIdsDeUsuario({ a: 1 }).size).toBe(0);
    expect(recolectarIdsDeUsuario(null).size).toBe(0);
    expect(recolectarIdsDeUsuario('texto').size).toBe(0);
  });
});

describe('respuestas que NO son datos pasan SIN TOCAR (p. ej. un PDF)', () => {
  const pdf = Buffer.from('%PDF-1.7 fake creadoPorId');
  const stream = Readable.from(['x']);
  const archivo = new StreamableFile(Buffer.from('%PDF'));

  it.each([
    ['string', 'creadoPorId: 5'],
    ['número', 42],
    ['booleano', true],
    ['null', null],
    ['undefined', undefined],
    ['Buffer', pdf],
    ['Uint8Array', new Uint8Array([1, 2, 3])],
    ['ArrayBuffer', new ArrayBuffer(8)],
    ['StreamableFile', archivo],
    ['stream', stream],
    ['Date', new Date()],
    ['Map', new Map([['creadoPorId', 5]])],
    ['Set', new Set([5])],
    ['Promise', Promise.resolve()],
    ['objeto con toJSON', { toJSON: () => ({ creadoPorId: 5 }), creadoPorId: 5 }],
  ])('%s: no es una respuesta de datos y se devuelve la MISMA referencia', (_nombre, valor) => {
    expect(esRespuestaDeDatos(valor)).toBe(false);
    expect(conNombresDeUsuario(valor, NOMBRES)).toBe(valor);
    expect(recolectarIdsDeUsuario(valor).size).toBe(0);
  });

  it('objetos, arreglos e instancias de clase SÍ son datos', () => {
    class E {}
    expect(esRespuestaDeDatos({})).toBe(true);
    expect(esRespuestaDeDatos([])).toBe(true);
    expect(esRespuestaDeDatos(new E())).toBe(true);
  });

  it('un Buffer anidado dentro de un objeto no se recorre ni se altera', () => {
    const r = conNombresDeUsuario({ creadoPorId: 5, adjunto: pdf }, NOMBRES) as { adjunto: Buffer };
    expect(r.adjunto).toBe(pdf);
  });
});
