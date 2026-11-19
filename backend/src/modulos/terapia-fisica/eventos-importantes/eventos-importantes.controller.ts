import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AnularRegistroDto } from 'src/common/dto/anular-registro.dto';
import { SeccionesBloqueB } from 'src/common/enums/rol.enum';
import { ReqConUsuario } from 'src/common/types/req-con-usuario.interface';
import { AccionRequerida } from 'src/modulos/autenticacion/decorators/roles.decorator';
import { SeccionRequerida } from 'src/modulos/autenticacion/decorators/seccionRequerida.decorator';
import { RolesAccionesGuard } from 'src/modulos/autenticacion/guard/actions.guard';
import { AuthGuard } from 'src/modulos/autenticacion/guard/auth.guard';
import { SeccionGuard } from 'src/modulos/autenticacion/guard/seccion.guard';
import { CrearEventoImportanteDto, ListarEventosImportantesDto } from './dto/evento-importante.dto';
import { EventoImportanteDetalle } from './evento-importante.lectura';
import { EventosImportantesService } from './eventos-importantes.service';
import { NombresDeUsuarioInterceptor } from 'src/common/usuarios/nombres-de-usuario.interceptor';

/**
 * Eventos importantes de Terapia Física (B.1.5). Sección única «TerapiaFisica» (RF-TR-02); verbos del
 * catálogo existente: Ver / Crear / Actualizar. `anular` se mapea a Actualizar. NO hay DELETE ni PATCH de edición.
 */
@ApiTags('Terapia Física · Eventos importantes')
@UseGuards(AuthGuard, RolesAccionesGuard, SeccionGuard)
@SeccionRequerida(SeccionesBloqueB.TERAPIA_FISICA)
@UseInterceptors(NombresDeUsuarioInterceptor) // CA-26: agrega los nombres de usuario a las respuestas (una consulta por petición)
@Controller()
export class EventosImportantesController {
  constructor(private readonly service: EventosImportantesService) {}

  @Get('expedientes/:expedienteId/eventos-importantes-tf')
  @AccionRequerida('Ver')
  @ApiOperation({
    summary: 'Bitácora de eventos (más reciente primero); filtros desde/hasta/tipoEventoId; excluye anulados salvo incluirAnulados=true',
  })
  listar(
    @Param('expedienteId', ParseIntPipe) expedienteId: number,
    @Query() filtros: ListarEventosImportantesDto,
  ): Promise<EventoImportanteDetalle[]> {
    return this.service.listar(expedienteId, filtros);
  }

  @Post('expedientes/:expedienteId/eventos-importantes-tf')
  @AccionRequerida('Crear')
  @ApiOperation({ summary: 'Registra un evento importante (la fecha y hora no puede ser futura)' })
  crear(
    @Param('expedienteId', ParseIntPipe) expedienteId: number,
    @Body() dto: CrearEventoImportanteDto,
    @Req() req: ReqConUsuario,
  ): Promise<EventoImportanteDetalle> {
    return this.service.crear(expedienteId, dto, req.user.id);
  }

  @Patch('eventos-importantes-tf/:id/anular')
  @AccionRequerida('Actualizar')
  @ApiOperation({ summary: 'Anula el evento con justificación (RN-02); nunca se borra' })
  anular(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AnularRegistroDto,
    @Req() req: ReqConUsuario,
  ): Promise<EventoImportanteDetalle> {
    return this.service.anular(id, dto.motivo, req.user.id);
  }
}
