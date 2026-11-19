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
import { ControlNutricional } from '../entities/control-nutricional.entity';
import { ControlNutricionalConVariacion } from './control-nutricional.lectura';
import { ControlesNutricionalesService } from './controles-nutricionales.service';
import { CrearControlNutricionalDto } from './dto/control-nutricional.dto';
import { NombresDeUsuarioInterceptor } from 'src/common/usuarios/nombres-de-usuario.interceptor';

/**
 * Control nutricional (B.1.9). Sección única «Nutricion» (RF-TR-02); verbos del catálogo existente:
 * Ver / Crear / Actualizar. `anular` se mapea a Actualizar. NO hay DELETE ni PATCH de edición.
 */
@ApiTags('Nutrición · Control nutricional')
@UseGuards(AuthGuard, RolesAccionesGuard, SeccionGuard)
@SeccionRequerida(SeccionesBloqueB.NUTRICION)
@UseInterceptors(NombresDeUsuarioInterceptor) // CA-26: agrega los nombres de usuario a las respuestas (una consulta por petición)
@Controller()
export class ControlesNutricionalesController {
  constructor(private readonly service: ControlesNutricionalesService) {}

  @Get('expedientes/:expedienteId/controles-nutricionales')
  @AccionRequerida('Ver')
  @ApiOperation({
    summary: 'Serie histórica de controles (más reciente primero) con la variación de peso e IMC; excluye anulados salvo incluirAnulados=true',
  })
  listar(
    @Param('expedienteId', ParseIntPipe) expedienteId: number,
    @Query() filtros: ListarRegistrosDto,
  ): Promise<ControlNutricionalConVariacion[]> {
    return this.service.listar(expedienteId, filtros);
  }

  @Post('expedientes/:expedienteId/controles-nutricionales')
  @AccionRequerida('Crear')
  @ApiOperation({ summary: 'Registra un control; el IMC y la edad al momento los calcula el servidor' })
  crear(
    @Param('expedienteId', ParseIntPipe) expedienteId: number,
    @Body() dto: CrearControlNutricionalDto,
    @Req() req: ReqConUsuario,
  ): Promise<ControlNutricional> {
    return this.service.crear(expedienteId, dto, req.user.id);
  }

  @Patch('controles-nutricionales/:id/anular')
  @AccionRequerida('Actualizar')
  @ApiOperation({ summary: 'Anula el control con justificación (RN-02); nunca se borra' })
  anular(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AnularRegistroDto,
    @Req() req: ReqConUsuario,
  ): Promise<ControlNutricional> {
    return this.service.anular(id, dto.motivo, req.user.id);
  }
}
