import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolUsuario } from 'src/modulos/gestion-usuario/entities/rol.entity';
import { RolPermisoAccion } from 'src/modulos/gestion-usuario/entities/rolPermisoAccion.entity';
import { SeccionesBloqueB } from 'src/common/enums/rol.enum';

/**
 * Verificación manual del permiso `Catalogos:<acción>` para el único caso en
 * que el permiso depende de un parámetro de la petición: listar catálogos
 * INCLUYENDO inactivos (`soloActivos=false`) es administración y exige
 * Catalogos:Ver, mientras que listar solo activos (los desplegables de los
 * formularios clínicos) basta con estar autenticado.
 *
 * Falla cerrado: sin roleId, rol inexistente/revocado o sin el permiso → 403.
 */
@Injectable()
export class CatalogosPermisosService {
  constructor(
    @InjectRepository(RolPermisoAccion)
    private readonly rpaRepo: Repository<RolPermisoAccion>,
    @InjectRepository(RolUsuario)
    private readonly rolRepo: Repository<RolUsuario>,
  ) {}

  async exigir(roleId: number | undefined | null, accion: string): Promise<void> {
    if (roleId === undefined || roleId === null) {
      throw new ForbiddenException('No autenticado o sin rol');
    }
    const rol = await this.rolRepo.findOne({ where: { id_rol: roleId } });
    if (!rol) throw new ForbiddenException('El rol del usuario no existe o fue revocado');

    const rpa = await this.rpaRepo.findOne({
      where: {
        rol: { id_rol: rol.id_rol },
        permiso: { seccion: SeccionesBloqueB.CATALOGOS },
        accion: { accion },
      },
      relations: ['permiso', 'rol', 'accion'],
    });
    if (!rpa) {
      throw new ForbiddenException(`No tienes permiso para ${accion} en ${SeccionesBloqueB.CATALOGOS}`);
    }
  }
}
