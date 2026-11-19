import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards, UseInterceptors } from '@nestjs/common';
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
import { EvaluacionMna } from '../entities/evaluacion-mna.entity';
import { CrearEvaluacionMnaDto } from './dto/evaluacion-mna.dto';
import { EvaluacionesMnaService, VistaPreviaMna } from './evaluaciones-mna.service';
import { NombresDeUsuarioInterceptor } from 'src/common/usuarios/nombres-de-usuario.interceptor';

/**
 * Mini Nutritional Assessment (B.1.10). Sección única «Nutricion» (RF-TR-02); verbos del catálogo existente:
 * Ver / Crear / Actualizar. `anular` se mapea a Actualizar. NO hay DELETE ni PATCH de edición.
 */
@ApiTags('Nutrición · Mini Nutritional Assessment (MNA)')
@UseGuards(AuthGuard, RolesAccionesGuard, SeccionGuard)
@SeccionRequerida(SeccionesBloqueB.NUTRICION)
@UseInterceptors(NombresDeUsuarioInterceptor) // CA-26: agrega los nombres de usuario a las respuestas (una consulta por petición)
@Controller()
export class EvaluacionesMnaController {
  constructor(private readonly service: EvaluacionesMnaService) {}

  @Get('expedientes/:expedienteId/evaluaciones-mna')
  @AccionRequerida('Ver')
  @ApiOperation({ summary: 'Evaluaciones MNA (más reciente primero); excluye anuladas salvo incluirAnulados=true' })
  listar(
    @Param('expedienteId', ParseIntPipe) expedienteId: number,
    @Query() filtros: ListarRegistrosDto,
  ): Promise<EvaluacionMna[]> {
    return this.service.listar(expedienteId, filtros);
  }

  // Ruta con sufijo fijo: no se confunde con el POST del registro.
  @Post('expedientes/:expedienteId/evaluaciones-mna/calcular')
  @HttpCode(200)
  @AccionRequerida('Crear')
  @ApiOperation({
    summary: 'Vista previa SIN guardar: mismos datos y mismas reglas que el registro; el valor oficial es el que devuelve el registro',
  })
  calcular(@Param('expedienteId', ParseIntPipe) expedienteId: number, @Body() dto: CrearEvaluacionMnaDto): Promise<VistaPreviaMna> {
    return this.service.calcular(expedienteId, dto);
  }

  @Post('expedientes/:expedienteId/evaluaciones-mna')
  @AccionRequerida('Crear')
  @ApiOperation({ summary: 'Registra una evaluación: subtotales, global, interpretaciones y versión los calcula el servidor' })
  crear(
    @Param('expedienteId', ParseIntPipe) expedienteId: number,
    @Body() dto: CrearEvaluacionMnaDto,
    @Req() req: ReqConUsuario,
  ): Promise<EvaluacionMna> {
    return this.service.crear(expedienteId, dto, req.user.id);
  }

  @Patch('evaluaciones-mna/:id/anular')
  @AccionRequerida('Actualizar')
  @ApiOperation({ summary: 'Anula la evaluación con justificación (RN-02); nunca se borra' })
  anular(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AnularRegistroDto,
    @Req() req: ReqConUsuario,
  ): Promise<EvaluacionMna> {
    return this.service.anular(id, dto.motivo, req.user.id);
  }
}
