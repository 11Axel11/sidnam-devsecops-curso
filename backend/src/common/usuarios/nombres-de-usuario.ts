import { StreamableFile } from '@nestjs/common';

/**
 * Mapeo ADITIVO de los ids de usuario de las respuestas del Bloque B a su nombre (CA-26): junto a cada `…Id` se agrega
 * su `…Nombre`. Ningún campo existente cambia ni desaparece. Funciones puras, sin base de datos.
 */
export const CAMPOS_DE_USUARIO = {
  creadoPorId: 'creadoPorNombre',
  modificadoPorId: 'modificadoPorNombre',
  anuladoPorId: 'anuladoPorNombre',
  usuarioResponsableId: 'usuarioResponsableNombre',
  usuarioExaminadorId: 'usuarioExaminadorNombre',
} as const;

type CampoDeUsuario = keyof typeof CAMPOS_DE_USUARIO;
const CLAVES_DE_USUARIO: string[] = Object.keys(CAMPOS_DE_USUARIO);
const esCampoDeUsuario = (k: string): k is CampoDeUsuario => CLAVES_DE_USUARIO.includes(k);

const PROFUNDIDAD_MAXIMA = 20;

/**
 * ¿Es un objeto o arreglo de DATOS (JSON), es decir, algo que se puede recorrer y enriquecer? Todo lo demás pasa
 * SIN TOCAR: strings, números, `null`, `Buffer`/typed arrays (p. ej. un PDF), `StreamableFile`, streams, `Date`,
 * `Map`/`Set`, promesas y objetos con `toJSON` propio. Las instancias de entidad TypeORM sí son datos.
 */
export function esRespuestaDeDatos(valor: unknown): valor is object {
  if (valor === null || typeof valor !== 'object') return false;
  if (Array.isArray(valor)) return true;
  if (Buffer.isBuffer(valor) || ArrayBuffer.isView(valor) || valor instanceof ArrayBuffer) return false;
  if (valor instanceof StreamableFile || valor instanceof Date || valor instanceof Map || valor instanceof Set) return false;
  if (valor instanceof Promise) return false;
  const candidato = valor as { pipe?: unknown; toJSON?: unknown; subscribe?: unknown };
  if (typeof candidato.pipe === 'function') return false; // streams
  if (typeof candidato.subscribe === 'function') return false; // observables
  if (typeof candidato.toJSON === 'function') return false;
  return true;
}

/** Todos los ids de usuario (números) que aparecen en la respuesta, en cualquier nivel. */
export function recolectarIdsDeUsuario(data: unknown): Set<number> {
  const ids = new Set<number>();
  const visitados = new WeakSet<object>();
  const visitar = (valor: unknown, profundidad: number): void => {
    if (!esRespuestaDeDatos(valor) || visitados.has(valor) || profundidad > PROFUNDIDAD_MAXIMA) return;
    visitados.add(valor);
    if (Array.isArray(valor)) {
      for (const e of valor) visitar(e, profundidad + 1);
      return;
    }
    for (const [k, v] of Object.entries(valor)) {
      if (esCampoDeUsuario(k) && typeof v === 'number') ids.add(v);
      else visitar(v, profundidad + 1);
    }
  };
  visitar(data, 0);
  return ids;
}

/**
 * Devuelve la respuesta con el nombre junto a cada id: `creadoPorId → creadoPorNombre`, etc. Id `null` o sin usuario
 * resoluble ⇒ nombre `null` (la clave siempre está). Reconstruye objetos PLANOS conservando el orden (el nombre queda
 * justo después de su id) y NO muta la entrada. Lo que no es un objeto o arreglo de datos se devuelve tal cual.
 */
export function conNombresDeUsuario<T>(data: T, nombres: ReadonlyMap<number, string | null>): T {
  const visitados = new WeakSet<object>();
  const convertir = (valor: unknown, profundidad: number): unknown => {
    if (!esRespuestaDeDatos(valor) || profundidad > PROFUNDIDAD_MAXIMA || visitados.has(valor)) return valor;
    visitados.add(valor);
    try {
      if (Array.isArray(valor)) return valor.map((e) => convertir(e, profundidad + 1));
      const salida: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(valor)) {
        salida[k] = convertir(v, profundidad + 1);
        if (esCampoDeUsuario(k)) {
          const nombreKey = CAMPOS_DE_USUARIO[k];
          if (!Object.prototype.hasOwnProperty.call(valor, nombreKey)) salida[nombreKey] = typeof v === 'number' ? (nombres.get(v) ?? null) : null;
        }
      }
      return salida;
    } finally {
      visitados.delete(valor); // el mismo objeto puede aparecer dos veces (no es un ciclo); solo se corta el ciclo real
    }
  };
  return convertir(data, 0) as T;
}
