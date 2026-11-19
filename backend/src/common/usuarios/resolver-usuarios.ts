import { DataSource, EntityManager, In } from 'typeorm';
import { Usuario } from 'src/modulos/gestion-usuario/entities/usuario.entity';

/** Algo que sepa dar un repositorio: un `DataSource` o el `EntityManager` de una transacción. */
export type OrigenDeConsulta = Pick<DataSource | EntityManager, 'getRepository'>;

/**
 * Nombre a mostrar de un usuario (CA-26): «Nombre Apellido1 Apellido2», sin el segundo apellido si no existe y
 * omitiendo partes en blanco. `null` si no queda ninguna parte. Es lo ÚNICO del usuario que sale en las respuestas:
 * nunca cédula, correo, contraseña, token, rol ni imagen.
 */
export function nombreCompleto(u: Pick<Usuario, 'name' | 'apellido1' | 'apellido2'>): string | null {
  const partes = [u.name, u.apellido1, u.apellido2].map((p) => (typeof p === 'string' ? p.trim() : '')).filter((p) => p.length > 0);
  return partes.length ? partes.join(' ') : null;
}

/**
 * Resuelve en UNA sola consulta (`IN`) el nombre de todos los ids pedidos (RF-TR-04 / CA-26).
 *
 *  - `null`/`undefined` y repetidos se descartan; si no queda ningún id NO se consulta nada.
 *  - Solo se piden `id, name, apellido1, apellido2` (jamás datos sensibles).
 *  - `withDeleted`: un usuario eliminado (borrado lógico) o inactivo se resuelve igual; el histórico no se pierde.
 *  - Un id que no existe en la tabla no aparece en el mapa (quien mapea lo trata como `null`).
 */
export async function resolverUsuarios(
  origen: OrigenDeConsulta,
  ids: Iterable<number | null | undefined>,
): Promise<Map<number, string | null>> {
  const unicos = [...new Set([...ids].filter((id): id is number => typeof id === 'number' && Number.isInteger(id)))];
  const nombres = new Map<number, string | null>();
  if (unicos.length === 0) return nombres;

  const usuarios = await origen.getRepository(Usuario).find({
    select: { id: true, name: true, apellido1: true, apellido2: true },
    where: { id: In(unicos) },
    withDeleted: true,
  });
  for (const u of usuarios) nombres.set(u.id, nombreCompleto(u));
  return nombres;
}
