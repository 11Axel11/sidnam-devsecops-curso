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
import { EvaluacionBarthel } from '../entities/evaluacion-barthel.entity';
import { CrearEvaluacionBarthelDto } from './dto/evaluacion-barthel.dto';
import { EvaluacionesBarthelService } from './evaluaciones-barthel.service';
import { NombresDeUsuarioInterceptor } from 'src/common/usuarios/nombres-de-usuario.interceptor';

/**
 * Índice de Barthel (B.1.6). Sección única «TerapiaFisica» (RF-TR-02); verbos del catálogo existente:
 * Ver / Crear / Actualizar. `anular` se mapea a Actualizar. NO hay DELETE ni PATCH de edición.
 */
@ApiTags('Terapia Física · Índice de Barthel')
@UseGuards(AuthGuard, RolesAccionesGuard, SeccionGuard)
@SeccionRequerida(SeccionesBloqueB.TERAPIA_FISICA)
@UseInterceptors(NombresDeUsuarioInterceptor) // CA-26: agrega los nombres de usuario a las respuestas (una consulta por petición)
@Controller()
export class EvaluacionesBarthelController {
  constructor(private readonly service: EvaluacionesBarthelService) {}

  @Get('expedientes/:expedienteId/evaluaciones-barthel')
  @AccionRequerida('Ver')
  @ApiOperation({ summary: 'Evaluaciones de Barthel (más reciente primero); excluye anuladas salvo incluirAnulados=true' })
  listar(
    @Param('expedienteId', ParseIntPipe) expedienteId: number,
    @Query() filtros: ListarRegistrosDto,
  ): Promise<EvaluacionBarthel[]> {
    return this.service.listar(expedienteId, filtros);
  }

  @Post('expedientes/:expedienteId/evaluaciones-barthel')
  @AccionRequerida('Crear')
  @ApiOperation({ summary: 'Registra una evaluación: el total y el grado de dependencia los calcula el servidor' })
  crear(
    @Param('expedienteId', ParseIntPipe) expedienteId: number,
    @Body() dto: CrearEvaluacionBarthelDto,
    @Req() req: ReqConUsuario,
  ): Promise<EvaluacionBarthel> {
    return this.service.crear(expedienteId, dto, req.user.id);
  }

  @Patch('evaluaciones-barthel/:id/anular')
  @AccionRequerida('Actualizar')
  @ApiOperation({ summary: 'Anula la evaluación con justificación (RN-02); nunca se borra' })
  anular(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AnularRegistroDto,
    @Req() req: ReqConUsuario,
  ): Promise<EvaluacionBarthel> {
    return this.service.anular(id, dto.motivo, req.user.id);
  }
}
