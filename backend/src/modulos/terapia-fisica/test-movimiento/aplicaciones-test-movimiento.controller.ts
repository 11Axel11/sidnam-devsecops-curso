import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AnularRegistroDto } from 'src/common/dto/anular-registro.dto';
import { ListarRegistrosDto } from 'src/common/dto/listar-registros.dto';
import { SeccionesBloqueB } from 'src/common/enums/rol.enum';
import { ReqConUsuario } from 'src/common/types/req-con-usuario.interface';
import { AccionRequerida } from 'src/modulos/autenticacion/decorators/roles.decorator';
import { SeccionRequerida } from 'src/modulos/autenticacion/decorators/seccionRequerida.decorator';
import { RolesAccionesGuard } from 'src/modulos/autenticacion/guard/actions.guard';
import { AuthGuard } from 'src/modulos/autenticacion/guard/auth.guard';
import { SeccionGuard } from 'src/modulos/autenticacion/guard/seccion.guard';
import { AplicacionesTestMovimientoService } from './aplicaciones-test-movimiento.service';
import { CrearAplicacionTestMovimientoDto } from './dto/aplicacion-test-movimiento.dto';
import { AplicacionTestMovimientoDetalle } from './test-movimiento.lectura';
import { NombresDeUsuarioInterceptor } from 'src/common/usuarios/nombres-de-usuario.interceptor';

/**
 * Test de Movimiento y Coordinación (B.1.8). Sección única «TerapiaFisica» (RF-TR-02); verbos del catálogo
 * existente: Ver / Crear / Actualizar. `anular` se mapea a Actualizar. NO hay DELETE ni PATCH de edición.
 */
@ApiTags('Terapia Física · Test de movimiento y coordinación')
@UseGuards(AuthGuard, RolesAccionesGuard, SeccionGuard)
@SeccionRequerida(SeccionesBloqueB.TERAPIA_FISICA)
@UseInterceptors(NombresDeUsuarioInterceptor) // CA-26: agrega los nombres de usuario a las respuestas (una consulta por petición)
@Controller()
export class AplicacionesTestMovimientoController {
  constructor(private readonly service: AplicacionesTestMovimientoService) {}

  @Get('expedientes/:expedienteId/aplicaciones-test-movimiento')
  @AccionRequerida('Ver')
  @ApiOperation({ summary: 'Aplicaciones del test con sus ejercicios (más reciente primero); excluye anuladas salvo incluirAnulados=true' })
  listar(
    @Param('expedienteId', ParseIntPipe) expedienteId: number,
    @Query() filtros: ListarRegistrosDto,
  ): Promise<AplicacionTestMovimientoDetalle[]> {
    return this.service.listar(expedienteId, filtros);
  }

  // Ruta con ':id' declarada sola bajo su propio prefijo: no se confunde con la del expediente.
  @Get('aplicaciones-test-movimiento/:id')
  @AccionRequerida('Ver')
  @ApiOperation({ summary: 'Detalle de una aplicación (cualquier estado) con sus ejercicios' })
  detalle(@Param('id', ParseIntPipe) id: number): Promise<AplicacionTestMovimientoDetalle> {
    return this.service.obtenerDetalle(id);
  }

  @Post('expedientes/:expedienteId/aplicaciones-test-movimiento')
  @AccionRequerida('Crear')
  @ApiOperation({ summary: 'Registra una aplicación: cabecera + un elemento por cada ejercicio activo (todo o nada)' })
  crear(
    @Param('expedienteId', ParseIntPipe) expedienteId: number,
    @Body() dto: CrearAplicacionTestMovimientoDto,
    @Req() req: ReqConUsuario,
  ): Promise<AplicacionTestMovimientoDetalle> {
    return this.service.crear(expedienteId, dto, req.user.id);
  }

  @Patch('aplicaciones-test-movimiento/:id/anular')
  @AccionRequerida('Actualizar')
  @ApiOperation({ summary: 'Anula la aplicación con justificación (RN-02); nunca se borra' })
  anular(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AnularRegistroDto,
    @Req() req: ReqConUsuario,
  ): Promise<AplicacionTestMovimientoDetalle> {
    return this.service.anular(id, dto.motivo, req.user.id);
  }
}
