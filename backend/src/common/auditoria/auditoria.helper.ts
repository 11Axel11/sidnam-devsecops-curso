import { Auditable } from './auditable.entity';

/**
 * Estampa `creadoPorId` con el id del usuario autenticado de la petición
 * (nunca con un valor que venga del body/DTO). Llamar SIEMPRE después de
 * `repository.create(dto)` y ANTES de `repository.save(...)`, para que
 * sobrescriba cualquier `creadoPorId` que un DTO mal armado (o un cliente
 * malicioso) haya podido colar en el objeto:
 *
 *   const entidad = repo.create(dto);
 *   aplicarAuditoriaCreacion(entidad, req.user.id);
 *   await repo.save(entidad);
 *
 * `fechaCreacion` NO se toca acá: los hooks de Auditable la estampan con la
 * hora de Node en el primer save() (ver auditable.entity.ts: zona horaria).
 */
export function aplicarAuditoriaCreacion<T extends Auditable>(
  entidad: T,
  usuarioActualId: number,
): T {
  entidad.creadoPorId = usuarioActualId;
  return entidad;
}

/**
 * Estampa `modificadoPorId` con el id del usuario autenticado de la
 * petición (nunca con un valor que venga del body/DTO). Llamar en cada
 * PUT/PATCH, antes de `repository.save(...)`:
 *
 *   const entidad = await repo.findOneByOrFail({ id });
 *   Object.assign(entidad, dto); // dto nunca debe tener creadoPorId/modificadoPorId
 *   aplicarAuditoriaModificacion(entidad, req.user.id);
 *   await repo.save(entidad);
 *
 * `creadoPorId` y `fechaCreacion` NO se tocan acá — se fijan una sola vez
 * en la creación y no vuelven a cambiar. `fechaModificacion` tampoco se
 * toca acá: los hooks de Auditable la actualizan con la hora de Node en cada
 * save() que cambie algo. Con repository.update()/QueryBuilder los hooks NO
 * corren: pasar `fechaModificacion: new Date()` en el set.
 */
export function aplicarAuditoriaModificacion<T extends Auditable>(
  entidad: T,
  usuarioActualId: number,
): T {
  entidad.modificadoPorId = usuarioActualId;
  return entidad;
}
