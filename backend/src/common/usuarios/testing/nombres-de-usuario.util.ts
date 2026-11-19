/* eslint-disable @typescript-eslint/no-unsafe-function-type, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call -- doble de prueba en memoria */
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { INTERCEPTORS_METADATA } from '@nestjs/common/constants';
import { lastValueFrom, of } from 'rxjs';
import { CAMPOS_DE_USUARIO } from 'src/common/usuarios/nombres-de-usuario';
import { NombresDeUsuarioInterceptor } from 'src/common/usuarios/nombres-de-usuario.interceptor';
import { Usuario } from 'src/modulos/gestion-usuario/entities/usuario.entity';

/**
 * Apoyo de las pruebas de «nombres de usuario» (CA-26) de los módulos: usuarios de ejemplo en la base simulada, el
 * interceptor ejecutado sobre la respuesta REAL de un servicio y la comprobación de que los campos de siempre se
 * conservan idénticos.
 */
export const KARINA = { id: 5, name: 'Karina', apellido1: 'Mora', apellido2: 'Díaz' };
/** Eliminada (borrado lógico) y sin segundo apellido: debe resolverse igual. */
export const ELENA = { id: 6, name: 'Elena', apellido1: 'Rojas', apellido2: null, deletedAt: new Date('2026-09-01T00:00:00Z') };
export const NOMBRE_KARINA = 'Karina Mora Díaz';
export const NOMBRE_ELENA = 'Elena Rojas';

interface BaseConUsuarios {
  insertar: (entidad: Function, fila: Record<string, unknown>) => unknown;
  dataSource: { getRepository: (e: Function) => unknown };
}

/** Inserta a Karina (activa, id 5) y a Elena (eliminada, id 6) y devuelve el interceptor y el contador de consultas de usuarios. */
export function montarUsuarios(db: BaseConUsuarios) {
  db.insertar(Usuario, { ...KARINA, estado: 'activo' });
  db.insertar(Usuario, { ...ELENA, estado: 'inactivo' });
  let consultasDeUsuarios = 0;
  const original = db.dataSource.getRepository.bind(db.dataSource);
  db.dataSource.getRepository = (e: Function) => {
    if (e === Usuario) consultasDeUsuarios++;
    return original(e);
  };
  const interceptor = new NombresDeUsuarioInterceptor(db.dataSource as never);
  return {
    interceptor,
    consultasDeUsuarios: () => consultasDeUsuarios,
    reiniciar: () => {
      consultasDeUsuarios = 0;
    },
  };
}

/** Pasa la respuesta de un servicio por el interceptor, como lo haría Nest. */
export const pasarPorInterceptor = (interceptor: NombresDeUsuarioInterceptor, respuesta: unknown): Promise<unknown> =>
  lastValueFrom(interceptor.intercept({} as ExecutionContext, { handle: () => of(respuesta) } as CallHandler));

export const tieneElInterceptor = (controller: Function): boolean =>
  ((Reflect.getMetadata(INTERCEPTORS_METADATA, controller) as unknown[] | undefined) ?? []).includes(NombresDeUsuarioInterceptor);

const NOMBRES = new Set<string>(Object.values(CAMPOS_DE_USUARIO));
const aJson = (v: unknown): unknown => JSON.parse(JSON.stringify(v));

/** Quita, en cualquier nivel, las claves `…Nombre` de usuario (lo ÚNICO que debe agregar el interceptor). */
export function sinNombresDeUsuario(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(sinNombresDeUsuario);
  if (valor && typeof valor === 'object' && !(valor instanceof Date)) {
    return Object.fromEntries(Object.entries(valor).filter(([k]) => !NOMBRES.has(k)).map(([k, v]) => [k, sinNombresDeUsuario(v)]));
  }
  return valor;
}

/** Cuenta (en cualquier nivel) los `…Id` de usuario con valor y los que quedaron con su `…Nombre` no nulo. */
export function contarNombres(valor: unknown): { ids: number; conNombre: number } {
  const r = { ids: 0, conNombre: 0 };
  const visitar = (v: unknown): void => {
    if (Array.isArray(v)) return v.forEach(visitar);
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      const o = v as Record<string, unknown>;
      for (const [k, x] of Object.entries(o)) {
        if (k in CAMPOS_DE_USUARIO && typeof x === 'number') {
          r.ids++;
          if (typeof o[CAMPOS_DE_USUARIO[k as keyof typeof CAMPOS_DE_USUARIO]] === 'string') r.conNombre++;
        } else visitar(x);
      }
    }
  };
  visitar(valor);
  return r;
}

/**
 * La respuesta enriquecida conserva EXACTAMENTE lo de siempre (comparado como JSON, que es lo que sale por la red) y
 * agrega un nombre a cada id de usuario no nulo.
 */
export function esperarSoloAditivo(original: unknown, enriquecida: unknown): { ids: number; conNombre: number } {
  expect(aJson(sinNombresDeUsuario(enriquecida))).toEqual(aJson(original));
  return contarNombres(enriquecida);
}
