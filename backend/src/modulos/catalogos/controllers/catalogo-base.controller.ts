import { Body, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { RolesAccionesGuard } from 'src/modulos/autenticacion/guard/actions.guard';
import { SeccionGuard } from 'src/modulos/autenticacion/guard/seccion.guard';
import { AccionRequerida } from 'src/modulos/autenticacion/decorators/roles.decorator';
import { SeccionRequerida } from 'src/modulos/autenticacion/decorators/seccionRequerida.decorator';
import { SeccionesBloqueB } from 'src/common/enums/rol.enum';
import { CatalogoBase } from '../entities/catalogo-base.entity';
import { CatalogoService } from '../services/catalogo.service';
import { CatalogosPermisosService } from '../services/catalogos-permisos.service';
import { CrearCatalogoDto, ListarCatalogoDto } from '../dto/catalogo.dto';
import { ReqConUsuario } from 'src/common/types/req-con-usuario.interface';

/**
 * Endpoints comunes a los 5 catálogos (RF-TR-03). Cada catálogo concreto es
 * una subclase mínima que solo declara @Controller(ruta) y @UseGuards(AuthGuard)
 * (ver catalogos.controllers.ts). NO hay DELETE: solo desactivar/reactivar.
 *
 * Permisos (sección única «Catalogos», verbos del catálogo existente):
 *  - GET (activos)               → cualquier usuario autenticado (desplegables).
 *  - GET soloActivos=false       → Catalogos:Ver  (administración).
 *  - POST                        → Catalogos:Crear
 *  - PATCH :id/desactivar|reactivar → Catalogos:Actualizar
 */
export abstract class CatalogoBaseController<T extends CatalogoBase> {
  protected constructor(
    protected readonly service: CatalogoService<T>,
    protected readonly permisos: CatalogosPermisosService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista el catálogo (por defecto solo activos)' })
  async listar(@Query() query: ListarCatalogoDto, @Req() req: ReqConUsuario): Promise<T[]> {
    const soloActivos = query.soloActivos ?? true;
    if (!soloActivos) {
      await this.permisos.exigir(req.user?.roleId, 'Ver');
    }
    return this.service.listar(soloActivos);
  }

  @Post()
  @UseGuards(RolesAccionesGuard, SeccionGuard)
  @AccionRequerida('Crear')
  @SeccionRequerida(SeccionesBloqueB.CATALOGOS)
  @ApiOperation({ summary: 'Crea un ítem del catálogo' })
  crear(@Body() dto: CrearCatalogoDto, @Req() req: ReqConUsuario): Promise<T> {
    return this.service.crear(dto.nombre, req.user.id);
  }

  @Patch(':id/desactivar')
  @UseGuards(RolesAccionesGuard, SeccionGuard)
  @AccionRequerida('Actualizar')
  @SeccionRequerida(SeccionesBloqueB.CATALOGOS)
  @ApiOperation({ summary: 'Desactiva el ítem (nunca se elimina)' })
  desactivar(@Param('id', ParseIntPipe) id: number, @Req() req: ReqConUsuario): Promise<T> {
    return this.service.desactivar(id, req.user.id);
  }

  @Patch(':id/reactivar')
  @UseGuards(RolesAccionesGuard, SeccionGuard)
  @AccionRequerida('Actualizar')
  @SeccionRequerida(SeccionesBloqueB.CATALOGOS)
  @ApiOperation({ summary: 'Reactiva un ítem desactivado' })
  reactivar(@Param('id', ParseIntPipe) id: number, @Req() req: ReqConUsuario): Promise<T> {
    return this.service.reactivar(id, req.user.id);
  }
}
