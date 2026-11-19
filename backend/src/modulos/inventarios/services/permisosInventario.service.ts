import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Inventario } from '../entities/inventario.entity';
import { Producto } from '../entities/producto.entity';
import { RolUsuario } from 'src/modulos/gestion-usuario/entities/rol.entity';
import { RolPermisoAccion } from 'src/modulos/gestion-usuario/entities/rolPermisoAccion.entity';
import { CategoriasPrincipalesProductos } from 'src/common/enums/categoriasPrincipalesProductos.enum';

/**
 * Permisos de inventario con los permisos YA existentes, sin tocar el modelo:
 * lo que un rol podía hacer en Hogar con cada permiso (por categoría de
 * producto: Alimentos / Limpieza / Medicamentos) lo puede hacer ahora también
 * en CECUIDAM. La sede NO interviene: el permiso depende de la sección y la
 * acción, igual que antes.
 *
 * La sección se decide por la categoría REAL del producto (la de la base),
 * nunca por la que declare el cliente.
 *
 * Falla cerrado: sin roleId, rol inexistente/revocado o sin el permiso → 403.
 */
export const SECCION_POR_CATEGORIA: Record<CategoriasPrincipalesProductos, string> = {
  [CategoriasPrincipalesProductos.ALIMENTOS]: 'Alimentos',
  [CategoriasPrincipalesProductos.LIMPIEZA]: 'Limpieza',
  [CategoriasPrincipalesProductos.MEDICAMENTOS]: 'Medicamentos',
};

export const SECCION_SALIDAS = 'Salidas';

@Injectable()
export class PermisosInventarioService {
  constructor(
    @InjectRepository(RolPermisoAccion)
    private readonly rpaRepo: Repository<RolPermisoAccion>,
    @InjectRepository(RolUsuario)
    private readonly rolRepo: Repository<RolUsuario>,
    @InjectRepository(Inventario)
    private readonly inventarioRepo: Repository<Inventario>,
    @InjectRepository(Producto)
    private readonly productoRepo: Repository<Producto>,
  ) {}

  /** ¿Tiene el rol alguna de `acciones` en alguna de las `secciones`? */
  async tiene(roleId: number | undefined | null, secciones: string[], acciones: string[]): Promise<boolean> {
    if (roleId === undefined || roleId === null) return false;
    const rol = await this.rolRepo.findOne({ where: { id_rol: roleId } });
    if (!rol) return false;
    const rpa = await this.rpaRepo.findOne({
      where: {
        rol: { id_rol: rol.id_rol },
        permiso: { seccion: In(secciones) },
        accion: { accion: In(acciones) },
      },
      relations: ['permiso', 'rol', 'accion'],
    });
    return !!rpa;
  }

  private async exigirSecciones(
    roleId: number | undefined | null,
    secciones: string[],
    acciones: string[],
  ): Promise<void> {
    if (roleId === undefined || roleId === null) {
      throw new ForbiddenException('No autenticado o sin rol');
    }
    if (!(await this.tiene(roleId, secciones, acciones))) {
      throw new ForbiddenException(
        `No tienes permiso para ${acciones.join(' o ')} en ${secciones.join(' / ')}`,
      );
    }
  }

  /** Permiso sobre la categoría de un producto (la sección sale de la categoría). */
  exigirCategoria(
    roleId: number | undefined | null,
    categoria: CategoriasPrincipalesProductos,
    acciones: string[],
    seccionesExtra: string[] = [],
  ) {
    return this.exigirSecciones(roleId, [SECCION_POR_CATEGORIA[categoria], ...seccionesExtra], acciones);
  }

  /** Permiso sobre una existencia: la categoría sale del producto guardado. */
  async exigirParaExistencia(
    roleId: number | undefined | null,
    inventarioId: number,
    acciones: string[],
    seccionesExtra: string[] = [],
  ) {
    const inv = await this.inventarioRepo.findOne({
      where: { id: inventarioId },
      relations: { producto: true },
    });
    if (!inv) throw new NotFoundException(`Existencia ${inventarioId} no encontrada`);
    await this.exigirCategoria(roleId, inv.producto.categoriaTipo, acciones, seccionesExtra);
  }

  /** Igual, para varias existencias (endpoints por lote): debe cubrir TODAS. */
  async exigirParaExistencias(roleId: number | undefined | null, ids: number[], acciones: string[]) {
    const unicos = [...new Set(ids)];
    const filas = await this.inventarioRepo.find({
      where: { id: In(unicos) },
      relations: { producto: true },
    });
    const faltantes = unicos.filter((id) => !filas.some((f) => f.id === id));
    if (faltantes.length) {
      throw new NotFoundException(`Inventarios no encontrados: ${faltantes.join(', ')}`);
    }
    const categorias = new Set(filas.map((f) => f.producto.categoriaTipo));
    for (const c of categorias) await this.exigirCategoria(roleId, c, acciones);
  }

  /** Permiso sobre un producto ya existente del catálogo. */
  async exigirParaProducto(roleId: number | undefined | null, productoId: number, acciones: string[]) {
    const p = await this.productoRepo.findOne({ where: { id: productoId } });
    if (!p) throw new NotFoundException(`Producto ${productoId} no encontrado`);
    await this.exigirCategoria(roleId, p.categoriaTipo, acciones);
  }

  /**
   * Categorías sobre las que el rol tiene alguna de las `acciones` (para
   * listados sin categoría: se devuelven solo las que puede ver).
   */
  async categoriasPermitidas(
    roleId: number | undefined | null,
    acciones: string[],
  ): Promise<CategoriasPrincipalesProductos[]> {
    const permitidas: CategoriasPrincipalesProductos[] = [];
    for (const c of Object.values(CategoriasPrincipalesProductos)) {
      if (await this.tiene(roleId, [SECCION_POR_CATEGORIA[c]], acciones)) permitidas.push(c);
    }
    return permitidas;
  }
}
