import { ConflictException, NotFoundException } from '@nestjs/common';
import { DeepPartial, FindOptionsOrder, FindOptionsWhere, QueryFailedError, Repository } from 'typeorm';
import { aplicarAuditoriaCreacion, aplicarAuditoriaModificacion } from 'src/common/auditoria/auditoria.helper';
import { CatalogoBase } from '../entities/catalogo-base.entity';

/**
 * Lógica común de los cinco catálogos administrables (RF-TR-03).
 *
 * No es @Injectable a propósito: cada controller concreto la instancia con el
 * repositorio de su entidad. No existe `eliminar`: los ítems solo se
 * desactivan/reactivan para no romper las valoraciones históricas que los
 * referencian.
 */
export class CatalogoService<T extends CatalogoBase> {
  constructor(
    private readonly repo: Repository<T>,
    private readonly etiqueta: string,
  ) {}

  /** Activos por defecto; `soloActivos=false` incluye los inactivos. Orden estable por nombre. */
  async listar(soloActivos = true): Promise<T[]> {
    const where = (soloActivos ? { activo: true } : {}) as FindOptionsWhere<T>;
    return this.repo.find({ where, order: { nombre: 'ASC' } as FindOptionsOrder<T> });
  }

  async crear(nombre: string, usuarioId: number): Promise<T> {
    const limpio = nombre.trim();
    const existente = await this.repo.findOne({ where: { nombre: limpio } as FindOptionsWhere<T> });
    if (existente) throw this.duplicado(limpio, existente.activo);

    const nuevo = this.repo.create({ nombre: limpio, activo: true } as DeepPartial<T>);
    aplicarAuditoriaCreacion(nuevo, usuarioId);
    try {
      return await this.repo.save(nuevo);
    } catch (e) {
      // Carrera: otro request insertó el mismo nombre entre el findOne y el save.
      if (esDuplicado(e)) throw this.duplicado(limpio);
      throw e;
    }
  }

  desactivar(id: number, usuarioId: number): Promise<T> {
    return this.cambiarEstado(id, false, usuarioId);
  }

  reactivar(id: number, usuarioId: number): Promise<T> {
    return this.cambiarEstado(id, true, usuarioId);
  }

  /** Idempotente: si ya está en el estado pedido devuelve el ítem sin tocarlo (ni auditarlo). */
  private async cambiarEstado(id: number, activo: boolean, usuarioId: number): Promise<T> {
    const item = await this.repo.findOne({ where: { id } as FindOptionsWhere<T> });
    if (!item) throw new NotFoundException(`${this.etiqueta} #${id} no existe`);
    if (item.activo === activo) return item;

    item.activo = activo;
    aplicarAuditoriaModificacion(item, usuarioId);
    return this.repo.save(item);
  }

  private duplicado(nombre: string, inactivo?: boolean) {
    const pista = inactivo === false ? ' (existe pero está desactivado: reactívelo en lugar de crearlo)' : '';
    return new ConflictException(`Ya existe "${nombre}" en ${this.etiqueta}${pista}`);
  }
}

function esDuplicado(e: unknown): boolean {
  if (!(e instanceof QueryFailedError)) return false;
  const d = (e.driverError ?? e) as { code?: string; errno?: number };
  return d.code === 'ER_DUP_ENTRY' || d.errno === 1062;
}
